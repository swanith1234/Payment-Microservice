// Payment Gateway Types

export enum GatewayType {
  RAZORPAY = 'RAZORPAY',
  STRIPE = 'STRIPE',
  PAYU = 'PAYU',
}

// Request DTOs
export interface CreatePaymentGatewayDTO {
  name: string;
  type: string;
  credentials: {
    keyId?: string;
    keySecret?: string;
    webhookSecret?: string;
    [key: string]: any;
  };
  isActive?: boolean;
  isDefault?: boolean;
}

export interface UpdatePaymentGatewayDTO {
  name?: string;
  credentials?: any;
  isActive?: boolean;
  isDefault?: boolean;
}

// Razorpay specific DTOs
export interface CreateRazorpayOrderDTO {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, any>;
  userId?: number;
  walletId?: number;
  metadata?: Record<string, any>;
}

export interface VerifyRazorpayPaymentDTO {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  userId?: number;
  walletId?: number;
  metadata?: Record<string, any>;
}

export interface RazorpayWebhookDTO {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        method: string;
        email?: string;
        contact?: string;
        [key: string]: any;
      };
    };
    order?: {
      entity: {
        id: string;
        amount: number;
        currency: string;
        receipt: string;
        status: string;
        [key: string]: any;
      };
    };
  };
  created_at: number;
}

// Response DTOs
export interface PaymentGatewayResponseDTO {
  id: number;
  name: string;
  type: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Credentials excluded for security
}

export interface RazorpayOrderResponseDTO {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, any>;
  created_at: number;
}

export interface PaymentVerificationResponseDTO {
  verified: boolean;
  transactionId?: number;
  orderId: string;
  paymentId: string;
  amount: string;
  status: string;
}

// Utility functions
export const formatPaymentGatewayResponse = (gateway: any): PaymentGatewayResponseDTO => {
  return {
    id: gateway.id,
    name: gateway.name,
    type: gateway.type,
    isActive: gateway.isActive,
    isDefault: gateway.isDefault,
    createdAt: gateway.createdAt,
    updatedAt: gateway.updatedAt,
  };
};

// Gateway configuration interface
export interface IGatewayProvider {
  createOrder(data: any): Promise<any>;
  verifyPayment(data: any): Promise<boolean>;
  verifyWebhookSignature(payload: any, signature: string): boolean;
  getPaymentDetails(paymentId: string): Promise<any>;
  initiateRefund(paymentId: string, amount?: number, notes?: Record<string, any>): Promise<any>;
  createPaymentLink(data: any): Promise<any>;
}