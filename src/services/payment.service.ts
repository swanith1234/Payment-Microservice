import { TransactionType, PaymentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import gatewayFactory from './gatewayFactory.service';
import transactionRepository from '../repositories/transaction.repository';
import transactionService from './transaction.service';
import platformWalletService from './platformWallet.service';
import prisma from '../database/prismaClient';

// ✨ Configuration for automatic deductions
const DEDUCTION_CONFIG = {
  commissionRate: 15, // 15%
  taxRate: 18, // 18% GST
};

export class PaymentService {
  /**
   * Create payment order (Razorpay order)
   */
  async createPaymentOrder(data: {
    amount: number;
    currency?: string;
    userId?: number;
    walletId?: number;
    gatewayId?: number;
    metadata?: Record<string, any>;
  }): Promise<any> {
    try {
      // Get gateway provider
      const { provider, gateway } = await gatewayFactory.getProvider(data.gatewayId);

      // Create order with payment gateway
      const receipt = `receipt_${Date.now()}_${data.userId || 'guest'}`;
      const gatewayOrder = await provider.createOrder({
        amount: data.amount,
        currency: data.currency || 'INR',
        receipt,
        notes: data.metadata || {},
      });

      // Create transaction record (PENDING status)
      const transaction = await transactionRepository.create({
        type: TransactionType.CHARGE,
        amount: new Decimal(data.amount),
        currency: data.currency || 'INR',
        status: PaymentStatus.PENDING,
        userId: data.userId,
        walletId: data.walletId,
        externalId: gatewayOrder.id, // Razorpay order ID
        metadata: {
          ...data.metadata,
          gatewayType: gateway.type,
          gatewayOrderId: gatewayOrder.id,
          receipt,
        },
      });

      return {
        transaction,
        gatewayOrder,
        gateway: {
          id: gateway.id,
          name: gateway.name,
          type: gateway.type,
        },
      };
    } catch (error: any) {
      console.error('Create payment order error:', error);
      throw error;
    }
  }

  /**
   * Verify payment and update transaction
   */
  async verifyPayment(data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    userId?: number;
    walletId?: number;
    metadata?: Record<string, any>;
  }): Promise<any> {
    try {
      // Get Razorpay provider
      const { provider, gateway } = await gatewayFactory.getProviderByType('RAZORPAY');
      console.log('Verifying payment with Razorpay gateway:', gateway);

      // Verify signature
      const isValid = provider.verifyPayment({
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
      });
console.log('Payment signature valid:', isValid);
      if (!isValid) {
        throw new Error('Invalid payment signature');
      }

      // Get payment details from Razorpay
      const paymentDetails = await provider.getPaymentDetails(data.razorpay_payment_id);

      // Find transaction by order ID
      const transaction = await transactionRepository.findByExternalId(data.razorpay_order_id);

      if (!transaction) {
        throw new Error('Transaction not found for this order');
      }

      // Update transaction status to SUCCESS and update wallet
      const updatedTransaction = await transactionService.updateTransactionStatus(
        transaction.id,
        PaymentStatus.SUCCESS,
        {
          ...(transaction.metadata as Record<string, any> || {}),
          ...(data.metadata || {}),
          paymentId: data.razorpay_payment_id,
          paymentDetails: {
            method: paymentDetails.method,
            email: paymentDetails.email,
            contact: paymentDetails.contact,
            amount: paymentDetails.amount,
            status: paymentDetails.status,
          },
          verifiedAt: new Date().toISOString(),
        }
      );

      return {
        verified: true,
        transaction: updatedTransaction,
        paymentDetails,
      };
    } catch (error: any) {
      console.error('Verify payment error:', error);

      // Try to find and mark transaction as failed
      try {
        const transaction = await transactionRepository.findByExternalId(data.razorpay_order_id);
        if (transaction && transaction.status === PaymentStatus.PENDING) {
          await transactionRepository.updateStatus(transaction.id, PaymentStatus.FAILED, {
            ...(transaction.metadata as Record<string, any> || {}),
            failureReason: error.message,
            failedAt: new Date().toISOString(),
          });
        }
      } catch (updateError) {
        console.error('Failed to update transaction status:', updateError);
      }

      throw error;
    }
  }

  /**
   * Handle payment webhook from gateway
   */
  async handleWebhook(
    gatewayType: string,
    payload: any,
    signature: string
  ): Promise<any> {
    try {
      // Get gateway provider
      const { provider } = await gatewayFactory.getProviderByType(gatewayType);

      // Verify webhook signature
      const isValid = provider.verifyWebhookSignature(JSON.stringify(payload), signature);

      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      // Handle different webhook events
      const event = payload.event;
      let result: any;

      switch (event) {
        case 'payment.captured':
          result = await this.handlePaymentCaptured(payload);
          break;

        case 'payment.failed':
          result = await this.handlePaymentFailed(payload);
          break;

        case 'order.paid':
          result = await this.handleOrderPaid(payload);
          break;

        case 'refund.created':
          result = await this.handleRefundCreated(payload);
          break;

        default:
          console.log(`Unhandled webhook event: ${event}`);
          result = { handled: false, event };
      }

      return {
        success: true,
        event,
        result,
      };
    } catch (error: any) {
      console.error('Handle webhook error:', error);
      throw error;
    }
  }

  /**
   * Handle payment.captured webhook
   */
  private async handlePaymentCaptured(payload: any): Promise<any> {
    const payment = payload.payload.payment.entity;
    const orderId = payment.order_id;

    // Find transaction
    const transaction = await transactionRepository.findByExternalId(orderId);

    if (!transaction) {
      console.warn(`Transaction not found for order: ${orderId}`);
      return { handled: false, reason: 'Transaction not found' };
    }

    if (transaction.status !== PaymentStatus.PENDING) {
      console.log(`Transaction already processed: ${transaction.id}`);
      return { handled: false, reason: 'Already processed' };
    }

    // Update transaction to SUCCESS
    const updatedTransaction = await transactionService.updateTransactionStatus(
      transaction.id,
      PaymentStatus.SUCCESS,
      {
        ...(transaction.metadata as Record<string, any> || {}),
        webhookPaymentId: payment.id,
        webhookEvent: 'payment.captured',
        webhookReceivedAt: new Date().toISOString(),
      }
    );

    return {
      handled: true,
      transactionId: transaction.id,
      status: 'SUCCESS',
    };
  }

  /**
   * Handle payment.failed webhook
   */
  private async handlePaymentFailed(payload: any): Promise<any> {
    const payment = payload.payload.payment.entity;
    const orderId = payment.order_id;

    const transaction = await transactionRepository.findByExternalId(orderId);

    if (!transaction) {
      return { handled: false, reason: 'Transaction not found' };
    }

    await transactionRepository.updateStatus(transaction.id, PaymentStatus.FAILED, {
      ...(transaction.metadata as Record<string, any> || {}),
      failureReason: payment.error_description || 'Payment failed',
      webhookEvent: 'payment.failed',
      webhookReceivedAt: new Date().toISOString(),
    });

    return {
      handled: true,
      transactionId: transaction.id,
      status: 'FAILED',
    };
  }

  /**
   * Handle order.paid webhook
   */
  private async handleOrderPaid(payload: any): Promise<any> {
    // Similar to payment.captured
    return await this.handlePaymentCaptured(payload);
  }

  /**
   * Handle refund.created webhook
   */
  private async handleRefundCreated(payload: any): Promise<any> {
    const refund = payload.payload.refund?.entity || payload.payload.payment?.entity;
    const paymentId = refund.payment_id;

    console.log(`Refund created for payment: ${paymentId}`);

    return {
      handled: true,
      paymentId,
      refundId: refund.id,
      amount: refund.amount / 100, // Convert from paise to rupees
    };
  }

  /**
   * Create payment link
   */
  async createPaymentLink(data: {
    amount: number;
    currency?: string;
    description?: string;
    customer?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    userId?: number;
    walletId?: number;
    metadata?: Record<string, any>;
    gatewayId?: number;
  }): Promise<any> {
    try {
      const { provider, gateway } = await gatewayFactory.getProvider(data.gatewayId);

      // Create payment link
      const paymentLink = await provider.createPaymentLink({
        amount: data.amount,
        currency: data.currency || 'INR',
        description: data.description || 'Payment',
        customer: data.customer,
        notes: data.metadata || {},
      });

      // Create transaction record
      const transaction = await transactionRepository.create({
        type: TransactionType.CHARGE,
        amount: new Decimal(data.amount),
        currency: data.currency || 'INR',
        status: PaymentStatus.PENDING,
        userId: data.userId,
        walletId: data.walletId,
        externalId: paymentLink.id,
        metadata: {
          ...data.metadata,
          gatewayType: gateway.type,
          paymentLinkId: paymentLink.id,
          paymentLinkUrl: paymentLink.short_url,
          customer: data.customer,
        },
      });

      return {
        transaction,
        paymentLink: {
          id: paymentLink.id,
          url: paymentLink.short_url,
          referenceId: paymentLink.reference_id,
          status: paymentLink.status,
        },
        gateway: {
          id: gateway.id,
          name: gateway.name,
          type: gateway.type,
        },
      };
    } catch (error: any) {
      console.error('Create payment link error:', error);
      throw error;
    }
  }

  /**
   * Initiate refund through payment gateway
   */
  async initiateGatewayRefund(
    transactionId: number,
    reason?: string,
    amount?: number
  ): Promise<any> {
    try {
      // Get transaction
      const transaction = await transactionRepository.findById(transactionId);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== PaymentStatus.SUCCESS) {
        throw new Error('Can only refund successful transactions');
      }

      // Get payment ID from metadata
      const metadata = transaction.metadata as Record<string, any> || {};
      const paymentId = metadata.paymentId;
      if (!paymentId) {
        throw new Error('Payment ID not found in transaction metadata');
      }

      // Get gateway type from metadata
      const gatewayType = metadata.gatewayType;
      if (!gatewayType) {
        throw new Error('Gateway type not found in transaction metadata');
      }

      // Get provider
      const { provider } = await gatewayFactory.getProviderByType(gatewayType);

      // Initiate refund at gateway
      const gatewayRefund = await provider.initiateRefund(
        paymentId,
        amount || parseFloat(transaction.amount.toString())
      );

      // Process refund in our system
      const refundResult = await transactionService.processRefund(transactionId, reason);

      return {
        ...(refundResult || {}),
        gatewayRefund: {
          id: gatewayRefund.id,
          amount: gatewayRefund.amount / 100, // Convert from paise
          status: gatewayRefund.status,
        },
      };
    } catch (error: any) {
      console.error('Initiate gateway refund error:', error);
      throw error;
    }
  }
}

export default new PaymentService();