import { Decimal } from '@prisma/client/runtime/library';

// Request DTOs
export interface CreateWalletDTO {
  userId?: number;
  balance?: number;
  currency?: string;
  type: string;
}

export interface UpdateWalletBalanceDTO {
  amount: number;
  operation: 'ADD' | 'SUBTRACT';
}

// Response DTOs
export interface WalletResponseDTO {
  id: number;
  userId: number | null;
  balance: string; // Decimal as string for JSON serialization
  currency: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

// Utility function to convert Prisma Decimal to string
export const formatWalletResponse = (wallet: any): WalletResponseDTO => {
  return {
    id: wallet.id,
    userId: wallet.userId,
    balance: wallet.balance.toString(),
    currency: wallet.currency,
    type: wallet.type,
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,
  };
};