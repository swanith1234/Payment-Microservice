import { PayoutStatus } from '@prisma/client';

// Request DTOs
export interface CreatePayoutDTO {
  instructorId: number;
  walletId: number;
  amount: number;
  currency?: string;
  scheduledAt?: Date;
  metadata?: Record<string, any>;
}

export interface SchedulePayoutDTO {
  instructorId: number;
  walletId: number;
  amount: number;
  scheduledAt: Date;
  metadata?: Record<string, any>;
}

export interface ProcessPayoutDTO {
  payoutId: number;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName?: string;
  };
  metadata?: Record<string, any>;
}

export interface UpdatePayoutStatusDTO {
  status: PayoutStatus;
  referenceId?: string;
  metadata?: Record<string, any>;
}

export interface PayoutQueryDTO {
  instructorId?: number;
  walletId?: number;
  status?: PayoutStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Response DTOs
export interface PayoutResponseDTO {
  id: number;
  instructorId: number;
  walletId: number;
  amount: string; // Decimal as string
  currency: string;
  status: PayoutStatus;
  scheduledAt: Date | null;
  processedAt: Date | null;
  referenceId: string | null;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayoutItemResponseDTO {
  id: number;
  payoutId: number;
  transactionId: number | null;
  amount: string;
  releasedAt: Date | null;
  createdAt: Date;
}

// Utility functions
export const formatPayoutResponse = (payout: any): PayoutResponseDTO => {
  return {
    id: payout.id,
    instructorId: payout.instructorId,
    walletId: payout.walletId,
    amount: payout.amount.toString(),
    currency: payout.currency,
    status: payout.status,
    scheduledAt: payout.scheduledAt,
    processedAt: payout.processedAt,
    referenceId: payout.referenceId,
    metadata: payout.metadata,
    createdAt: payout.createdAt,
    updatedAt: payout.updatedAt,
  };
};

export const formatPayoutItemResponse = (item: any): PayoutItemResponseDTO => {
  return {
    id: item.id,
    payoutId: item.payoutId,
    transactionId: item.transactionId,
    amount: item.amount.toString(),
    releasedAt: item.releasedAt,
    createdAt: item.createdAt,
  };
};

// Payout configuration
export interface PayoutConfig {
  minimumAmount: number; // Minimum amount for payout
  processingFee: number; // Processing fee (flat or percentage)
  processingFeeType: 'FLAT' | 'PERCENTAGE';
  scheduleType: 'INSTANT' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  autoProcessEnabled: boolean;
}

export const DEFAULT_PAYOUT_CONFIG: PayoutConfig = {
  minimumAmount: 1000, // ₹1000 minimum
  processingFee: 10, // ₹10 flat fee or 1% if percentage
  processingFeeType: 'FLAT',
  scheduleType: 'WEEKLY',
  autoProcessEnabled: false,
};