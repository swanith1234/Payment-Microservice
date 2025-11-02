import { WalletType } from '@prisma/client';
import prisma from '../database/prismaClient';
import { Decimal } from '@prisma/client/runtime/library';

export class PlatformWalletService {
  /**
   * Get or create commission wallet
   */
  async getCommissionWallet() {
    let wallet = await prisma.wallet.findFirst({
      where: { type: WalletType.PLATFORM_COMMISSION },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: null,
          type: WalletType.PLATFORM_COMMISSION,
          balance: 0,
          currency: 'INR',
          metadata: {
            purpose: 'Platform commission collection',
            autoCreated: true,
            createdAt: new Date().toISOString(),
          },
        },
      });
      console.log('✅ Commission wallet created:', wallet.id);
    }

    return wallet;
  }

  /**
   * Get or create tax wallet
   */
  async getTaxWallet() {
    let wallet = await prisma.wallet.findFirst({
      where: { type: WalletType.PLATFORM_TAX },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: null,
          type: WalletType.PLATFORM_TAX,
          balance: 0,
          currency: 'INR',
          metadata: {
            purpose: 'Tax collection and holding',
            autoCreated: true,
            createdAt: new Date().toISOString(),
          },
        },
      });
      console.log('✅ Tax wallet created:', wallet.id);
    }

    return wallet;
  }

  /**
   * Get all platform wallets
   */
  async getAllPlatformWallets() {
    return await prisma.wallet.findMany({
      where: {
        type: {
          in: [
            WalletType.PLATFORM_COMMISSION,
            WalletType.PLATFORM_TAX,
            WalletType.PLATFORM_FEES,
          ],
        },
      },
    });
  }

  /**
   * Get platform revenue statistics
   */
  async getPlatformStats() {
    const [commission, tax, fees] = await Promise.all([
      prisma.wallet.findFirst({
        where: { type: WalletType.PLATFORM_COMMISSION },
        select: { balance: true },
      }),
      prisma.wallet.findFirst({
        where: { type: WalletType.PLATFORM_TAX },
        select: { balance: true },
      }),
      prisma.wallet.findFirst({
        where: { type: WalletType.PLATFORM_FEES },
        select: { balance: true },
      }),
    ]);

    const commissionBalance = commission?.balance || new Decimal(0);
    const taxBalance = tax?.balance || new Decimal(0);
    const feesBalance = fees?.balance || new Decimal(0);

    return {
      totalCommission: commissionBalance.toString(),
      totalTax: taxBalance.toString(),
      totalFees: feesBalance.toString(),
      totalRevenue: commissionBalance
        .plus(taxBalance)
        .plus(feesBalance)
        .toString(),
    };
  }

  /**
   * Get detailed revenue breakdown
   */
  async getRevenueBreakdown(startDate?: Date, endDate?: Date) {
    const where: any = {
      walletId: {
        in: (await this.getAllPlatformWallets()).map((w) => w.id),
      },
      status: 'SUCCESS',
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        wallet: true,
      },
    });

    const breakdown: any = {
      commission: { count: 0, amount: '0' },
      tax: { count: 0, amount: '0' },
      fees: { count: 0, amount: '0' },
    };

    let commissionTotal = new Decimal(0);
    let taxTotal = new Decimal(0);
    let feesTotal = new Decimal(0);

    transactions.forEach((txn) => {
      if (txn.type === 'COMMISSION') {
        breakdown.commission.count++;
        commissionTotal = commissionTotal.plus(txn.amount);
      } else if (txn.type === 'TAX') {
        breakdown.tax.count++;
        taxTotal = taxTotal.plus(txn.amount);
      }
    });

    breakdown.commission.amount = commissionTotal.toString();
    breakdown.tax.amount = taxTotal.toString();
    breakdown.fees.amount = feesTotal.toString();

    return breakdown;
  }

  /**
   * Transfer tax to government (when paying GST)
   */
  async transferTaxToGovernment(amount: number, referenceId: string, metadata?: any) {
    const taxWallet = await this.getTaxWallet();

    if (taxWallet.balance.lessThan(new Decimal(amount))) {
      throw new Error('Insufficient tax balance for transfer');
    }

    return await prisma.$transaction(async (tx) => {
      // Deduct from tax wallet
      await tx.wallet.update({
        where: { id: taxWallet.id },
        data: {
          balance: {
            decrement: new Decimal(amount),
          },
        },
      });

      // Create tax payment transaction
      await tx.transaction.create({
        data: {
          type: 'TAX',
          amount: new Decimal(amount),
          currency: 'INR',
          status: 'SUCCESS',
          walletId: taxWallet.id,
          metadata: {
            purpose: 'GST payment to government',
            referenceId,
            paidAt: new Date().toISOString(),
            ...metadata,
          },
        },
      });

      return {
        success: true,
        amount: amount,
        referenceId,
        remainingBalance: taxWallet.balance.minus(new Decimal(amount)).toString(),
      };
    });
  }

  /**
   * Get module-wise revenue
   */
  async getModuleWiseRevenue() {
    const transactions = await prisma.transaction.findMany({
      where: {
        type: 'CHARGE',
        status: 'SUCCESS',
      },
      select: {
        amount: true,
        metadata: true,
      },
    });

    const moduleRevenue: any = {
      LMS: { count: 0, amount: '0' },
      LIMS: { count: 0, amount: '0' },
      COLLEGE: { count: 0, amount: '0' },
      HRMS: { count: 0, amount: '0' },
      OTHER: { count: 0, amount: '0' },
    };

    const moduleTotals: any = {
      LMS: new Decimal(0),
      LIMS: new Decimal(0),
      COLLEGE: new Decimal(0),
      HRMS: new Decimal(0),
      OTHER: new Decimal(0),
    };

    transactions.forEach((txn) => {
      const metadata = txn.metadata as any;
      const moduleId = metadata?.moduleId || 'OTHER';
      const module = moduleId.toUpperCase();

      if (moduleRevenue[module]) {
        moduleRevenue[module].count++;
        moduleTotals[module] = moduleTotals[module].plus(txn.amount);
      } else {
        moduleRevenue.OTHER.count++;
        moduleTotals.OTHER = moduleTotals.OTHER.plus(txn.amount);
      }
    });

    // Convert to strings
    Object.keys(moduleTotals).forEach((key) => {
      moduleRevenue[key].amount = moduleTotals[key].toString();
    });

    return moduleRevenue;
  }
}

export default new PlatformWalletService();