import Razorpay from 'razorpay';
import crypto from 'crypto';
import { IGatewayProvider } from '../types/paymentGateway.types';

export class RazorpayProvider implements IGatewayProvider {
  private razorpay: Razorpay;
  private keySecret: string;
  private webhookSecret: string;

  constructor(credentials: {
    keyId: string;
    keySecret: string;
    webhookSecret?: string;
  }) {
    this.razorpay = new Razorpay({
      key_id: credentials.keyId,
      key_secret: credentials.keySecret,
    });
    this.keySecret = credentials.keySecret;
    this.webhookSecret = credentials.webhookSecret || '';
  }

  /**
   * Create Razorpay order
   */
  async createOrder(data: {
    amount: number;
    currency?: string;
    receipt?: string;
    notes?: Record<string, any>;
  }): Promise<any> {
    try {
      // Razorpay expects amount in paise (smallest currency unit)
      const amountInPaise = Math.round(data.amount * 100);

      const options = {
        amount: amountInPaise,
        currency: data.currency || 'INR',
        receipt: data.receipt || `receipt_${Date.now()}`,
        notes: data.notes || {},
      };

      const order = await this.razorpay.orders.create(options);
      return order;
    } catch (error: any) {
      console.error('Razorpay create order error:', error);
      throw new Error(`Failed to create Razorpay order: ${error.message}`);
    }
  }

  /**
   * Verify Razorpay payment signature
   */
  async verifyPayment(data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<boolean> {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

      // Generate signature
      const generatedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      // Compare signatures
      return generatedSignature === razorpay_signature;
    } catch (error: any) {
      console.error('Razorpay verify payment error:', error);
      return false;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      if (!this.webhookSecret) {
        console.warn('Webhook secret not configured');
        return false;
      }

      const generatedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      return generatedSignature === signature;
    } catch (error: any) {
      console.error('Razorpay verify webhook error:', error);
      return false;
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(paymentId: string): Promise<any> {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error: any) {
      console.error('Razorpay get payment details error:', error);
      throw new Error(`Failed to fetch payment details: ${error.message}`);
    }
  }

  /**
   * Get order details
   */
  async getOrderDetails(orderId: string): Promise<any> {
    try {
      const order = await this.razorpay.orders.fetch(orderId);
      return order;
    } catch (error: any) {
      console.error('Razorpay get order details error:', error);
      throw new Error(`Failed to fetch order details: ${error.message}`);
    }
  }

  /**
   * Initiate refund
   */
  async initiateRefund(
    paymentId: string,
    amount?: number,
    notes?: Record<string, any>
  ): Promise<any> {
    try {
      const options: any = {
        notes: notes || {},
      };

      // If amount is specified, refund that amount (partial refund)
      // Otherwise, full refund
      if (amount) {
        options.amount = Math.round(amount * 100); // Convert to paise
      }

      const refund = await this.razorpay.payments.refund(paymentId, options);
      return refund;
    } catch (error: any) {
      console.error('Razorpay initiate refund error:', error);
      throw new Error(`Failed to initiate refund: ${error.message}`);
    }
  }

  /**
   * Get refund details
   */
  async getRefundDetails(refundId: string): Promise<any> {
    try {
      const refund = await this.razorpay.refunds.fetch(refundId);
      return refund;
    } catch (error: any) {
      console.error('Razorpay get refund details error:', error);
      throw new Error(`Failed to fetch refund details: ${error.message}`);
    }
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
    notify?: {
      sms?: boolean;
      email?: boolean;
    };
    reminder_enable?: boolean;
    notes?: Record<string, any>;
    callback_url?: string;
    callback_method?: string;
  }): Promise<any> {
    try {
      const amountInPaise = Math.round(data.amount * 100);

      const options = {
        amount: amountInPaise,
        currency: data.currency || 'INR',
        description: data.description || 'Payment',
        customer: data.customer || {},
        notify: data.notify || { sms: true, email: true },
        reminder_enable: data.reminder_enable !== false,
        notes: data.notes || {},
        callback_url: data.callback_url,
        callback_method: data.callback_method || 'get',
      };

      const paymentLink = await this.razorpay.paymentLink.create(options);
      return paymentLink;
    } catch (error: any) {
      console.error('Razorpay create payment link error:', error);
      throw new Error(`Failed to create payment link: ${error.message}`);
    }
  }

  /**
   * Cancel payment link
   */
  async cancelPaymentLink(linkId: string): Promise<any> {
    try {
      const result = await this.razorpay.paymentLink.cancel(linkId);
      return result;
    } catch (error: any) {
      console.error('Razorpay cancel payment link error:', error);
      throw new Error(`Failed to cancel payment link: ${error.message}`);
    }
  }
}