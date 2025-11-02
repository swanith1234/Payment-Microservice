import { TransactionType, PaymentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import transactionRepository from '../repositories/transaction.repository';
import walletRepository from '../repositories/wallet.repository';
import { TRANSACTION_TYPE_CONFIG } from '../types/transaction.types';
import prisma from '../database/prismaClient';

export class TransactionService {
  private readonly PLATFORM_COMMISSION_RATE = 0.1; // 10%
  private readonly PLATFORM_TAX_RATE = 0.05;       // 5%
  private readonly DEFAULT_INSTRUCTOR_RATE = 1 - this.PLATFORM_COMMISSION_RATE - this.PLATFORM_TAX_RATE;

  /**
   * Create transaction and update wallet balance atomically
   * This ensures data consistency using Prisma transactions
   */ 
  async createTransactionWithWalletUpdate(data: {
    type: TransactionType;
    amount: number;
    currency?: string;
    userId?: number;
    walletId?: number;
    paymentMethod?: any;
    externalId?: string;
    metadata?: any;
    autoUpdateWallet?: boolean; // Default true
  }): Promise<any> {
    const autoUpdateWallet = data.autoUpdateWallet !== false;
    const config = TRANSACTION_TYPE_CONFIG[data.type];

    // Use Prisma transaction for atomicity
    return await prisma.$transaction(async (tx) => {
      // Create transaction
      const transaction = await tx.transaction.create({
        data: {
          type: data.type,
          amount: new Decimal(data.amount),
          currency: data.currency || 'INR',
          status: PaymentStatus.PENDING,
          userId: data.userId,
          walletId: data.walletId,
          paymentMethod: data.paymentMethod,
          externalId: data.externalId,
          metadata: data.metadata,
        },
      });

      // Update wallet balance if applicable and wallet exists
      if (autoUpdateWallet && config.affectsWallet && data.walletId && config.operation) {
        const wallet = await tx.wallet.findUnique({
          where: { id: data.walletId },
        });

        if (!wallet) {
          throw new Error('Wallet not found');
        }

        // Check sufficient balance for deductions
        if (config.operation === 'SUBTRACT') {
          if (wallet.balance.lessThan(new Decimal(data.amount))) {
            throw new Error('Insufficient wallet balance');
          }
        }

        // Update wallet balance
        const prismaOperation = config.operation === 'ADD' ? 'increment' : 'decrement';
        await tx.wallet.update({
          where: { id: data.walletId },
          data: {
            balance: {
              [prismaOperation]: new Decimal(data.amount),
            },
          },
        });
      }

      return transaction;
    });
  }

  /**
   * Process refund - creates refund transaction and updates wallet
   */
  async processRefund(
    originalTransactionId: number,
    reason?: string
  ): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      // Get original transaction
      const originalTransaction = await tx.transaction.findUnique({
        where: { id: originalTransactionId },
      });

      if (!originalTransaction) {
        throw new Error('Original transaction not found');
      }

      if (originalTransaction.status !== PaymentStatus.SUCCESS) {
        throw new Error('Can only refund successful transactions');
      }

      // Check if already refunded
      const existingRefund = await tx.transaction.findFirst({
        where: {
          type: TransactionType.REFUND,
          metadata: {
            path: ['originalTransactionId'],
            equals: originalTransactionId,
          },
        },
      });

      if (existingRefund) {
        throw new Error('Transaction already refunded');
      }

      // Create refund transaction
      const refundTransaction = await tx.transaction.create({
        data: {
          type: TransactionType.REFUND,
          amount: originalTransaction.amount,
          currency: originalTransaction.currency,
          status: PaymentStatus.SUCCESS,
          userId: originalTransaction.userId,
          walletId: originalTransaction.walletId,
          paymentMethod: originalTransaction.paymentMethod,
          metadata: {
            originalTransactionId: originalTransaction.id,
            reason: reason || 'Refund requested',
            refundedAt: new Date().toISOString(),
          },
        },
      });

      // Update original transaction status
      await tx.transaction.update({
        where: { id: originalTransactionId },
        data: { status: PaymentStatus.REFUNDED },
      });

      // Deduct from wallet (reverse the original charge)
      if (originalTransaction.walletId) {
        const wallet = await tx.wallet.findUnique({
          where: { id: originalTransaction.walletId },
        });

        if (wallet) {
          // Check sufficient balance
          if (wallet.balance.lessThan(originalTransaction.amount)) {
            throw new Error('Insufficient wallet balance for refund');
          }

          await tx.wallet.update({
            where: { id: originalTransaction.walletId },
            data: {
              balance: {
                decrement: originalTransaction.amount,
              },
            },
          });
        }
      }

      return {
        refundTransaction,
        originalTransaction: await tx.transaction.findUnique({
          where: { id: originalTransactionId },
        }),
      };
    });
  }

  /**
   * Update transaction status with wallet update if needed
   */
   // 85%

async updateTransactionStatus(
  transactionId: number,
  newStatus: PaymentStatus,
  metadata?: any
): Promise<any> {
  return await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) throw new Error('Transaction not found');

    const oldStatus = transaction.status;

    // ✅ Update transaction status first
    const updatedTransaction = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: newStatus,
        metadata: metadata || transaction.metadata,
      },
    });

    // ✅ Proceed only if payment just succeeded
    if (oldStatus === PaymentStatus.PENDING && newStatus === PaymentStatus.SUCCESS) {
      const totalAmount = new Decimal(transaction.amount);

      // Calculate splits using constants
      const instructorAmount = totalAmount.mul(this.DEFAULT_INSTRUCTOR_RATE);
      const commissionAmount = totalAmount.mul(this.PLATFORM_COMMISSION_RATE);
      const taxAmount = totalAmount.mul(this.PLATFORM_TAX_RATE);

      // Fetch wallets
      const instructorWallet = await tx.wallet.findFirst({
        where: { type: 'INSTRUCTOR', userId: transaction.userId },
      });
      const commissionWallet = await tx.wallet.findFirst({
        where: { type: 'PLATFORM_COMMISSION' },
      });
      const taxWallet = await tx.wallet.findFirst({
        where: { type: 'PLATFORM_TAX' },
      });

      if (!instructorWallet) throw new Error('Instructor wallet not found');
      if (!commissionWallet) throw new Error('Commission wallet not found');
      if (!taxWallet) throw new Error('Tax wallet not found');

      // ✅ Update wallet balances atomically
      await tx.wallet.update({
        where: { id: instructorWallet.id },
        data: { balance: { increment: instructorAmount } },
      });

      await tx.wallet.update({
        where: { id: commissionWallet.id },
        data: { balance: { increment: commissionAmount } },
      });

      await tx.wallet.update({
        where: { id: taxWallet.id },
        data: { balance: { increment: taxAmount } },
      });

      // ✅ Store breakdown in metadata for auditing
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          metadata: {
            ...(metadata || {}),
            splitDetails: {
              instructorAmount: instructorAmount.toString(),
              commissionAmount: commissionAmount.toString(),
              taxAmount: taxAmount.toString(),
            },
          },
        },
      });
    }

    return updatedTransaction;
  });
}

  /**
   * Calculate net amount after deductions (commission, tax)
   */
  calculateNetAmount(
    grossAmount: number,
    commissionPercent: number = 0,
    taxPercent: number = 0
  ): {
    grossAmount: string;
    commission: string;
    tax: string;
    netAmount: string;
  } {
    const gross = new Decimal(grossAmount);
    const commission = gross.times(commissionPercent).dividedBy(100);
    const tax = gross.times(taxPercent).dividedBy(100);
    const net = gross.minus(commission).minus(tax);

    return {
      grossAmount: gross.toString(),
      commission: commission.toString(),
      tax: tax.toString(),
      netAmount: net.toString(),
    };
  }
}

export default new TransactionService();