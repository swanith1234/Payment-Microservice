import { PrismaClient, Transaction, TransactionType, PaymentStatus, PaymentMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../database/prismaClient';

export interface TransactionFilter {
  userId?: number;
  walletId?: number;
  status?: PaymentStatus;
  type?: TransactionType;
  startDate?: Date;
  endDate?: Date;
}

export class TransactionRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Create a new transaction
   */
  async create(data: {
    type: TransactionType;
    amount: Decimal;
    currency?: string;
    status?: PaymentStatus;
    userId?: number;
    walletId?: number;
    paymentMethod?: PaymentMethod;
    externalId?: string;
    metadata?: any;
  }): Promise<Transaction> {
    return await this.prisma.transaction.create({
      data: {
        type: data.type,
        amount: data.amount,
        currency: data.currency || 'INR',
        status: data.status || PaymentStatus.PENDING,
        userId: data.userId,
        walletId: data.walletId,
        paymentMethod: data.paymentMethod,
        externalId: data.externalId,
        metadata: data.metadata,
      },
    });
  }

  /**
   * Find transaction by ID
   */
  async findById(id: number): Promise<Transaction | null> {
    return await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        wallet: true,
      },
    });
  }

  /**
   * Find transaction by external ID (payment gateway ID)
   */
  async findByExternalId(externalId: string): Promise<Transaction | null> {
    return await this.prisma.transaction.findUnique({
      where: { externalId },
      include: {
        wallet: true,
      },
    });
  }

  /**
   * Find transactions by user ID
   */
  async findByUserId(
    userId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    transactions: Transaction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          wallet: true,
        },
      }),
      this.prisma.transaction.count({ where: { userId } }),
    ]);

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find transactions by wallet ID
   */
  async findByWalletId(
    walletId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    transactions: Transaction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { walletId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.count({ where: { walletId } }),
    ]);

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find transactions with filters
   */
  async findWithFilters(
    filters: TransactionFilter,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    transactions: Transaction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.walletId) where.walletId = filters.walletId;
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          wallet: true,
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update transaction status
   */
  async updateStatus(
    id: number,
    status: PaymentStatus,
    metadata?: any
  ): Promise<Transaction> {
    const updateData: any = { status };

    if (metadata) {
      updateData.metadata = metadata;
    }

    return await this.prisma.transaction.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Get transaction statistics for a user
   */
  async getUserStats(userId: number): Promise<{
    totalTransactions: number;
    successfulTransactions: number;
    totalAmount: string;
    successfulAmount: string;
  }> {
    const [total, successful, amounts] = await Promise.all([
      this.prisma.transaction.count({ where: { userId } }),
      this.prisma.transaction.count({
        where: { userId, status: PaymentStatus.SUCCESS },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, status: PaymentStatus.SUCCESS },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalTransactions: total,
      successfulTransactions: successful,
      totalAmount: amounts._sum.amount?.toString() || '0',
      successfulAmount: amounts._sum.amount?.toString() || '0',
    };
  }

  /**
   * Get transaction statistics for a wallet
   */
  async getWalletStats(walletId: number): Promise<{
    totalTransactions: number;
    totalCredits: string;
    totalDebits: string;
  }> {
    const transactions = await this.prisma.transaction.findMany({
      where: { walletId, status: PaymentStatus.SUCCESS },
    });

    let totalCredits = new Decimal(0);
    let totalDebits = new Decimal(0);

    transactions.forEach((txn) => {
      if (['CHARGE'].includes(txn.type)) {
        totalCredits = totalCredits.plus(txn.amount);
      } else if (['REFUND', 'COMMISSION', 'TAX', 'PAYOUT'].includes(txn.type)) {
        totalDebits = totalDebits.plus(txn.amount);
      }
    });

    return {
      totalTransactions: transactions.length,
      totalCredits: totalCredits.toString(),
      totalDebits: totalDebits.toString(),
    };
  }

  /**
   * Create refund transaction for an existing transaction
   */
  async createRefund(
    originalTransactionId: number,
    reason?: string
  ): Promise<Transaction> {
    const originalTransaction = await this.findById(originalTransactionId);

    if (!originalTransaction) {
      throw new Error('Original transaction not found');
    }

    if (originalTransaction.status !== PaymentStatus.SUCCESS) {
      throw new Error('Can only refund successful transactions');
    }

    return await this.create({
      type: TransactionType.REFUND,
      amount: originalTransaction.amount,
      currency: originalTransaction.currency,
      status: PaymentStatus.SUCCESS,
userId: originalTransaction.userId ?? undefined,
  walletId: originalTransaction.walletId ?? undefined,
  paymentMethod: originalTransaction.paymentMethod ?? undefined,
      metadata: {
        originalTransactionId: originalTransaction.id,
        reason: reason || 'Refund requested',
        refundedAt: new Date().toISOString(),
      },
    });
  }
}

export default new TransactionRepository();