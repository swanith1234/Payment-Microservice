import { PayoutStatus, TransactionType, PaymentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import payoutRepository from '../repositories/payout.repository';
import walletRepository from '../repositories/wallet.repository';
import transactionRepository from '../repositories/transaction.repository';
import prisma from '../database/prismaClient';
import { DEFAULT_PAYOUT_CONFIG } from '../types/payout.types';

export class PayoutService {
  /**
   * Schedule a payout for an instructor
   */
  async schedulePayout(data: {
    instructorId: number;
    walletId: number;
    amount: number;
    scheduledAt?: Date;
    metadata?: Record<string, any>;
  }): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      // Validate wallet belongs to instructor
      const wallet = await tx.wallet.findUnique({
        where: { id: data.walletId },
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (wallet.userId !== data.instructorId) {
        throw new Error('Wallet does not belong to this instructor');
      }

      // Check minimum payout amount
      if (data.amount < DEFAULT_PAYOUT_CONFIG.minimumAmount) {
        throw new Error(
          `Minimum payout amount is ₹${DEFAULT_PAYOUT_CONFIG.minimumAmount}`
        );
      }

      // Check wallet balance
      if (wallet.balance.lessThan(new Decimal(data.amount))) {
        throw new Error('Insufficient wallet balance for payout');
      }

      // Create payout record
      const payout = await tx.payout.create({
        data: {
          instructorId: data.instructorId,
          walletId: data.walletId,
          amount: new Decimal(data.amount),
          currency: wallet.currency,
          status: data.scheduledAt ? PayoutStatus.SCHEDULED : PayoutStatus.PENDING,
          scheduledAt: data.scheduledAt,
          metadata: data.metadata,
        },
      });

      return payout;
    });
  }

  /**
   * Process a payout (transfer money to bank account)
   */
  async processPayout(
    payoutId: number,
    bankDetails?: {
      accountNumber: string;
      ifscCode: string;
      accountHolderName: string;
      bankName?: string;
    }
  ): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      // Get payout details
      const payout = await tx.payout.findUnique({
        where: { id: payoutId },
        include: { wallet: true },
      });

      if (!payout) {
        throw new Error('Payout not found');
      }

      // Validate payout status
      if (payout.status !== PayoutStatus.PENDING && payout.status !== PayoutStatus.SCHEDULED) {
        throw new Error(`Cannot process payout with status: ${payout.status}`);
      }

      // Check wallet balance
      if (payout.wallet.balance.lessThan(payout.amount)) {
        throw new Error('Insufficient wallet balance for payout');
      }

      // Update payout status to PROCESSING
      await tx.payout.update({
        where: { id: payoutId },
        data: {
          status: PayoutStatus.PROCESSING,
          metadata: {
            ...(payout.metadata as Record<string, any> || {}),
            bankDetails,
            processingStartedAt: new Date().toISOString(),
          },
        },
      });

      // Create PAYOUT transaction
      const transaction = await tx.transaction.create({
        data: {
          type: TransactionType.PAYOUT,
          amount: payout.amount,
          currency: payout.currency,
          status: PaymentStatus.SUCCESS,
          userId: payout.instructorId,
          walletId: payout.walletId,
          metadata: {
            payoutId: payout.id,
            bankDetails,
            processedAt: new Date().toISOString(),
          },
        },
      });

      // Deduct from wallet
      await tx.wallet.update({
        where: { id: payout.walletId },
        data: {
          balance: {
            decrement: payout.amount,
          },
        },
      });

      // Create payout item (links payout to transaction)
      await tx.payoutItem.create({
        data: {
          payoutId: payout.id,
          transactionId: transaction.id,
          amount: payout.amount,
          releasedAt: new Date(),
        },
      });

      // In real production, you would integrate with a payment gateway here
      // to actually transfer money to bank account
      // For now, we simulate immediate success

      // Update payout status to COMPLETED
      const completedPayout = await tx.payout.update({
        where: { id: payoutId },
        data: {
          status: PayoutStatus.COMPLETED,
          processedAt: new Date(),
          referenceId: `PAYOUT_${Date.now()}_${payoutId}`,
          metadata: {
            ...(payout.metadata as Record<string, any> || {}),
            bankDetails,
            completedAt: new Date().toISOString(),
            transactionId: transaction.id,
          },
        },
      });

      return {
        payout: completedPayout,
        transaction,
      };
    });
  }

  /**
   * Process all scheduled payouts (for cron job)
   */
  async processScheduledPayouts(): Promise<{
    processed: number;
    failed: number;
    results: any[];
  }> {
    const now = new Date();
    const scheduledPayouts = await payoutRepository.findScheduledPayouts(now);

    const results = [];
    let processed = 0;
    let failed = 0;

    for (const payout of scheduledPayouts) {
      try {
        const result = await this.processPayout(payout.id);
        results.push({
          payoutId: payout.id,
          status: 'success',
          result,
        });
        processed++;
      } catch (error: any) {
        console.error(`Failed to process payout ${payout.id}:`, error);

        // Mark payout as FAILED
        await payoutRepository.updateStatus(payout.id, PayoutStatus.FAILED, {
          metadata: {
            ...(payout.metadata as Record<string, any> || {}),
            failureReason: error.message,
            failedAt: new Date().toISOString(),
          },
        });

        results.push({
          payoutId: payout.id,
          status: 'failed',
          error: error.message,
        });
        failed++;
      }
    }

    return {
      processed,
      failed,
      results,
    };
  }

  /**
   * Cancel a payout
   */
  async cancelPayout(payoutId: number, reason?: string): Promise<any> {
    const payout = await payoutRepository.findById(payoutId);

    if (!payout) {
      throw new Error('Payout not found');
    }

    // Can only cancel PENDING or SCHEDULED payouts
    if (payout.status !== PayoutStatus.PENDING && payout.status !== PayoutStatus.SCHEDULED) {
      throw new Error(`Cannot cancel payout with status: ${payout.status}`);
    }

    return await payoutRepository.updateStatus(payoutId, PayoutStatus.FAILED, {
      metadata: {
        ...(payout.metadata as Record<string, any> || {}),
        cancelled: true,
        cancelReason: reason || 'Cancelled by user',
        cancelledAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Get available balance for payout (wallet balance - pending payouts)
   */
  async getAvailableBalance(walletId: number): Promise<{
    walletBalance: string;
    pendingPayouts: string;
    availableForPayout: string;
  }> {
    const wallet = await walletRepository.findById(walletId);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Get pending payout amounts
    const pendingPayouts = await prisma.payout.aggregate({
      where: {
        walletId,
        status: {
          in: [PayoutStatus.PENDING, PayoutStatus.SCHEDULED, PayoutStatus.PROCESSING],
        },
      },
      _sum: {
        amount: true,
      },
    });

    const pendingAmount = pendingPayouts._sum.amount || new Decimal(0);
    const availableAmount = wallet.balance.minus(pendingAmount);

    return {
      walletBalance: wallet.balance.toString(),
      pendingPayouts: pendingAmount.toString(),
      availableForPayout: availableAmount.greaterThan(0)
        ? availableAmount.toString()
        : '0',
    };
  }

  /**
   * Calculate payout amount after fees
   */
  calculatePayoutAmount(grossAmount: number): {
    grossAmount: string;
    processingFee: string;
    netAmount: string;
  } {
    const gross = new Decimal(grossAmount);
    let fee: Decimal;

    if (DEFAULT_PAYOUT_CONFIG.processingFeeType === 'FLAT') {
      fee = new Decimal(DEFAULT_PAYOUT_CONFIG.processingFee);
    } else {
      // Percentage
      fee = gross.times(DEFAULT_PAYOUT_CONFIG.processingFee).dividedBy(100);
    }

    const net = gross.minus(fee);

    return {
      grossAmount: gross.toString(),
      processingFee: fee.toString(),
      netAmount: net.greaterThan(0) ? net.toString() : '0',
    };
  }

  /**
   * Retry failed payout
   */
  async retryPayout(payoutId: number): Promise<any> {
    const payout = await payoutRepository.findById(payoutId);

    if (!payout) {
      throw new Error('Payout not found');
    }

    if (payout.status !== PayoutStatus.FAILED) {
      throw new Error('Can only retry FAILED payouts');
    }

    // Reset status to PENDING
    await payoutRepository.updateStatus(payoutId, PayoutStatus.PENDING, {
      metadata: {
        ...(payout.metadata as Record<string, any> || {}),
        retried: true,
        retriedAt: new Date().toISOString(),
      },
    });

    // Process the payout
    return await this.processPayout(payoutId);
  }
}

export default new PayoutService();