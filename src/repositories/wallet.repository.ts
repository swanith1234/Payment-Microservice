import { PrismaClient, Wallet, WalletType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../database/prismaClient';

export class WalletRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Create a new wallet
   */
  async create(data: {
    userId?: number;
    balance?: Decimal;
    currency?: string;
    type: WalletType;
  }): Promise<Wallet> {
    return await this.prisma.wallet.create({
      data: {
        userId: data.userId,
        balance: data.balance || new Decimal(0),
        currency: data.currency || 'INR',
        type: data.type,
      },
    });
  }

  /**
   * Find wallet by ID
   */
  async findById(id: number): Promise<Wallet | null> {
    return await this.prisma.wallet.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Last 10 transactions
        },
      },
    });
  }

  /**
   * Find wallet by user ID
   */
  async findByUserId(userId: number): Promise<Wallet[]> {
    return await this.prisma.wallet.findMany({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  /**
   * Get all wallets with pagination
   */
  async findAll(page: number = 1, limit: number = 10): Promise<{
    wallets: Wallet[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [wallets, total] = await Promise.all([
      this.prisma.wallet.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.wallet.count(),
    ]);

    return {
      wallets,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update wallet balance (use Prisma transactions for atomicity)
   */
  async updateBalance(
    id: number,
    amount: Decimal,
    operation: 'increment' | 'decrement'
  ): Promise<Wallet> {
    return await this.prisma.wallet.update({
      where: { id },
      data: {
        balance: {
          [operation]: amount,
        },
      },
    });
  }

  /**
   * Check if wallet has sufficient balance
   */
  async hasSufficientBalance(id: number, amount: Decimal): Promise<boolean> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id },
      select: { balance: true },
    });

    if (!wallet) return false;
    return wallet.balance.greaterThanOrEqualTo(amount);
  }

  /**
   * Delete wallet (soft delete by setting balance to 0 or hard delete)
   */
  async delete(id: number): Promise<Wallet> {
    return await this.prisma.wallet.delete({
      where: { id },
    });
  }

  /**
   * Get wallet balance only
   */
  async getBalance(id: number): Promise<Decimal | null> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id },
      select: { balance: true },
    });
    return wallet?.balance || null;
  }
}

export default new WalletRepository();