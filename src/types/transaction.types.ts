import { TransactionType, PaymentStatus, PaymentMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Request DTOs
export interface CreateTransactionDTO {
  type: TransactionType;
  amount: number;
  currency: string;
  userId: number;
  walletId: number;
  paymentMethod?: PaymentMethod;
  externalId?: string; // Payment gateway transaction ID
  metadata?: Record<string, any>;
}

export interface UpdateTransactionStatusDTO {
  status: PaymentStatus;
  metadata?: Record<string, any>;
}

export interface RefundTransactionDTO {
  reason?: string;
  metadata?: Record<string, any>;
}

export interface TransactionQueryDTO {
  userId?: number;
  walletId?: number;
  status?: PaymentStatus;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Response DTOs
export interface TransactionResponseDTO {
  id: number;
  externalId: string | null;
  type: TransactionType;
  amount: string; // Decimal as string
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  userId: number | null;
  walletId: number | null;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

// Utility function to format transaction response
export const formatTransactionResponse = (transaction: any): TransactionResponseDTO => {
  return {
    id: transaction.id,
    externalId: transaction.externalId,
    type: transaction.type,
    amount: transaction.amount.toString(),
    currency: transaction.currency,
    status: transaction.status,
    paymentMethod: transaction.paymentMethod,
    userId: transaction.userId,
    walletId: transaction.walletId,
    metadata: transaction.metadata,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
};

// Transaction type configurations
export const TRANSACTION_TYPE_CONFIG = {
  CHARGE: {
    affectsWallet: true,
    operation: 'ADD' as const,
    description: 'Payment received',
  },
  REFUND: {
    affectsWallet: true,
    operation: 'SUBTRACT' as const,
    description: 'Payment refunded',
  },
  COMMISSION: {
    affectsWallet: true,
    operation: 'SUBTRACT' as const,
    description: 'Platform commission deducted',
  },
  TAX: {
    affectsWallet: true,
    operation: 'SUBTRACT' as const,
    description: 'Tax deducted',
  },
  NET_PAYOUT: {
    affectsWallet: false,
    operation: null,
    description: 'Net amount calculated for payout',
  },
  PAYOUT: {
    affectsWallet: true,
    operation: 'SUBTRACT' as const,
    description: 'Payout processed',
  },
  ADJUSTMENT: {
    affectsWallet: true,
    operation: null, // Determined by amount sign
    description: 'Manual adjustment',
  },
};