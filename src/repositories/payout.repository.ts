import { PrismaClient, Payout, PayoutStatus, PayoutItem } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../database/prismaClient';

export interface PayoutFilter {
  instructorId?: number;
  walletId?: number;
  status?: PayoutStatus;
  startDate?: Date;
  endDate?: Date;
}

export class PayoutRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Create a new payout
   */
  async create(data: {
    instructorId: number;
    walletId: number;
    amount: Decimal;
    currency?: string;
    status?: PayoutStatus;
    scheduledAt?: Date;
    metadata?: any;
  }): Promise<Payout> {
    return await this.prisma.payout.create({
      data: {
        instructorId: data.instructorId,
        walletId: data.walletId,
        amount: data.amount,
        currency: data.currency || 'INR',
        status: data.status || PayoutStatus.PENDING,
        scheduledAt: data.scheduledAt,
        metadata: data.metadata,
      },
    });
  }

  /**
   * Find payout by ID
   */
  async findById(id: number): Promise<Payout | null> {
    return await this.prisma.payout.findUnique({
      where: { id },
      include: {
        wallet: true,
        items: {
          include: {
            transaction: true,
          },
        },
      },
    });
  }

  /**
   * Find payouts by instructor ID
   */
  async findByInstructorId(
    instructorId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    payouts: Payout[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where: { instructorId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          wallet: true,
          items: true,
        },
      }),
      this.prisma.payout.count({ where: { instructorId } }),
    ]);

    return {
      payouts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find payouts with filters
   */
  async findWithFilters(
    filters: PayoutFilter,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    payouts: Payout[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.instructorId) where.instructorId = filters.instructorId;
    if (filters.walletId) where.walletId = filters.walletId;
    if (filters.status) where.status = filters.status;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          wallet: true,
          items: true,
        },
      }),
      this.prisma.payout.count({ where }),
    ]);

    return {
      payouts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find scheduled payouts (for cron job)
   */
  async findScheduledPayouts(beforeDate: Date): Promise<Payout[]> {
    return await this.prisma.payout.findMany({
      where: {
        status: PayoutStatus.SCHEDULED,
        scheduledAt: {
          lte: beforeDate,
        },
      },
      include: {
        wallet: true,
      },
    });
  }

  /**
   * Find pending payouts
   */
  async findPendingPayouts(): Promise<Payout[]> {
    return await this.prisma.payout.findMany({
      where: {
        status: PayoutStatus.PENDING,
      },
      include: {
        wallet: true,
      },
    });
  }

  /**
   * Update payout status
   */
  async updateStatus(
    id: number,
    status: PayoutStatus,
    data?: {
      processedAt?: Date;
      referenceId?: string;
      metadata?: any;
    }
  ): Promise<Payout> {
    const updateData: any = { status };

    if (data?.processedAt) updateData.processedAt = data.processedAt;
    if (data?.referenceId) updateData.referenceId = data.referenceId;
    if (data?.metadata) updateData.metadata = data.metadata;

    return await this.prisma.payout.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Create payout item
   */
  async createPayoutItem(data: {
    payoutId: number;
    transactionId?: number;
    amount: Decimal;
    releasedAt?: Date;
  }): Promise<PayoutItem> {
    return await this.prisma.payoutItem.create({
      data: {
        payoutId: data.payoutId,
        transactionId: data.transactionId,
        amount: data.amount,
        releasedAt: data.releasedAt,
      },
    });
  }

  /**
   * Get payout statistics for an instructor
   */
  async getInstructorStats(instructorId: number): Promise<{
    totalPayouts: number;
    completedPayouts: number;
    pendingPayouts: number;
    totalAmountPaid: string;
    totalAmountPending: string;
  }> {
    const [total, completed, pending, completedAmount, pendingAmount] = await Promise.all([
      this.prisma.payout.count({ where: { instructorId } }),
      this.prisma.payout.count({
        where: { instructorId, status: PayoutStatus.COMPLETED },
      }),
      this.prisma.payout.count({
        where: {
          instructorId,
          status: { in: [PayoutStatus.PENDING, PayoutStatus.SCHEDULED, PayoutStatus.PROCESSING] },
        },
      }),
      this.prisma.payout.aggregate({
        where: { instructorId, status: PayoutStatus.COMPLETED },
        _sum: { amount: true },
      }),
      this.prisma.payout.aggregate({
        where: {
          instructorId,
          status: { in: [PayoutStatus.PENDING, PayoutStatus.SCHEDULED, PayoutStatus.PROCESSING] },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalPayouts: total,
      completedPayouts: completed,
      pendingPayouts: pending,
      totalAmountPaid: completedAmount._sum.amount?.toString() || '0',
      totalAmountPending: pendingAmount._sum.amount?.toString() || '0',
    };
  }

  /**
   * Delete payout (only if PENDING or FAILED)
   */
  async delete(id: number): Promise<Payout> {
    const payout = await this.findById(id);

    if (!payout) {
      throw new Error('Payout not found');
    }

    if (payout.status !== PayoutStatus.PENDING && payout.status !== PayoutStatus.FAILED) {
      throw new Error('Can only delete PENDING or FAILED payouts');
    }

    return await this.prisma.payout.delete({
      where: { id },
    });
  }
}

export default new PayoutRepository();