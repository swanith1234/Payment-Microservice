import { Request, Response } from 'express';
import paymentService from '../services/payment.service';
import { formatTransactionResponse } from '../types/transaction.types';

export class PaymentController {
  /**
   * Create payment order
   * POST /api/payments/create-order
   */
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const { amount, currency, userId, walletId, gatewayId, metadata } = req.body;

      if (!amount || amount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Valid amount is required',
        });
        return;
      }

      const result = await paymentService.createPaymentOrder({
        amount,
        currency,
        userId,
        walletId,
        gatewayId,
        metadata,
      });

      res.status(201).json({
        success: true,
        message: 'Payment order created successfully',
        data: {
          transaction: formatTransactionResponse(result.transaction),
          order: {
            id: result.gatewayOrder.id,
            amount: result.gatewayOrder.amount / 100, // Convert from paise
            currency: result.gatewayOrder.currency,
            receipt: result.gatewayOrder.receipt,
          },
          gateway: result.gateway,
        },
      });
    } catch (error: any) {
      console.error('Create order error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create payment order',
        message: error.message,
      });
    }
  }

  /**
   * Verify payment
   * POST /api/payments/verify
   */
  async verifyPayment(req: Request, res: Response): Promise<void> {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        userId,
        walletId,
        metadata,
      } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        res.status(400).json({
          success: false,
          error: 'Order ID, payment ID, and signature are required',
        });
        return;
      }

      const result = await paymentService.verifyPayment({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        userId,
        walletId,
        metadata,
      });

      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          verified: result.verified,
          transaction: formatTransactionResponse(result.transaction),
          paymentDetails: {
            id: result.paymentDetails.id,
            amount: result.paymentDetails.amount / 100,
            currency: result.paymentDetails.currency,
            method: result.paymentDetails.method,
            status: result.paymentDetails.status,
          },
        },
      });
    } catch (error: any) {
      console.error('Verify payment error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment verification failed',
        message: error.message,
      });
    }
  }

  /**
   * Handle payment webhook
   * POST /api/payments/webhook/:gatewayType
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { gatewayType } = req.params;
      const signature = req.headers['x-razorpay-signature'] as string;

      if (!signature) {
        res.status(400).json({
          success: false,
          error: 'Webhook signature missing',
        });
        return;
      }

      const result = await paymentService.handleWebhook(
        gatewayType.toUpperCase(),
        req.body,
        signature
      );

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        data: result,
      });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process webhook',
        message: error.message,
      });
    }
  }

  /**
   * Create payment link
   * POST /api/payments/create-link
   */
  async createPaymentLink(req: Request, res: Response): Promise<void> {
    try {
      const {
        amount,
        currency,
        description,
        customer,
        userId,
        walletId,
        metadata,
        gatewayId,
      } = req.body;

      if (!amount || amount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Valid amount is required',
        });
        return;
      }

      const result = await paymentService.createPaymentLink({
        amount,
        currency,
        description,
        customer,
        userId,
        walletId,
        metadata,
        gatewayId,
      });

      res.status(201).json({
        success: true,
        message: 'Payment link created successfully',
        data: {
          transaction: formatTransactionResponse(result.transaction),
          paymentLink: result.paymentLink,
          gateway: result.gateway,
        },
      });
    } catch (error: any) {
      console.error('Create payment link error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create payment link',
        message: error.message,
      });
    }
  }

  /**
   * Initiate gateway refund
   * POST /api/payments/refund/:transactionId
   */
  async initiateRefund(req: Request, res: Response): Promise<void> {
    try {
      const transactionId = parseInt(req.params.transactionId);
      const { reason, amount } = req.body;

      if (isNaN(transactionId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid transaction ID',
        });
        return;
      }

      const result = await paymentService.initiateGatewayRefund(
        transactionId,
        reason,
        amount
      );

      res.status(200).json({
        success: true,
        message: 'Refund initiated successfully',
        data: {
          refundTransaction: formatTransactionResponse(result.refundTransaction),
          originalTransaction: formatTransactionResponse(result.originalTransaction),
          gatewayRefund: result.gatewayRefund,
        },
      });
    } catch (error: any) {
      console.error('Initiate refund error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initiate refund',
        message: error.message,
      });
    }
  }
}

export default new PaymentController();