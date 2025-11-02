import { Request, Response } from 'express';
import platformWalletService from '../services/platformWallet.service';

export class AdminController {
  /**
   * Get platform revenue statistics
   * GET /api/admin/platform-stats
   */
  async getPlatformStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await platformWalletService.getPlatformStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Get platform stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch platform stats',
        message: error.message,
      });
    }
  }

  /**
   * Get commission wallet balance
   * GET /api/admin/commission-balance
   */
  async getCommissionBalance(req: Request, res: Response): Promise<void> {
    try {
      const wallet = await platformWalletService.getCommissionWallet();

      res.status(200).json({
        success: true,
        data: {
          walletId: wallet.id,
          balance: wallet.balance.toString(),
          currency: wallet.currency,
          type: wallet.type,
        },
      });
    } catch (error: any) {
      console.error('Get commission balance error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch commission balance',
        message: error.message,
      });
    }
  }

  /**
   * Get tax wallet balance
   * GET /api/admin/tax-balance
   */
  async getTaxBalance(req: Request, res: Response): Promise<void> {
    try {
      const wallet = await platformWalletService.getTaxWallet();

      res.status(200).json({
        success: true,
        data: {
          walletId: wallet.id,
          balance: wallet.balance.toString(),
          currency: wallet.currency,
          type: wallet.type,
        },
      });
    } catch (error: any) {
      console.error('Get tax balance error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tax balance',
        message: error.message,
      });
    }
  }

  /**
   * Get all platform wallets
   * GET /api/admin/platform-wallets
   */
  async getPlatformWallets(req: Request, res: Response): Promise<void> {
    try {
      const wallets = await platformWalletService.getAllPlatformWallets();

      res.status(200).json({
        success: true,
        data: wallets.map((wallet) => ({
          id: wallet.id,
          type: wallet.type,
          balance: wallet.balance.toString(),
          currency: wallet.currency,
          metadata: wallet.metadata,
          createdAt: wallet.createdAt,
          updatedAt: wallet.updatedAt,
        })),
      });
    } catch (error: any) {
      console.error('Get platform wallets error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch platform wallets',
        message: error.message,
      });
    }
  }

  /**
   * Get revenue breakdown
   * GET /api/admin/revenue-breakdown?startDate=2025-01-01&endDate=2025-12-31
   */
  async getRevenueBreakdown(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;

      const breakdown = await platformWalletService.getRevenueBreakdown(
        startDate,
        endDate
      );

      res.status(200).json({
        success: true,
        data: {
          breakdown,
          dateRange: {
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
          },
        },
      });
    } catch (error: any) {
      console.error('Get revenue breakdown error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch revenue breakdown',
        message: error.message,
      });
    }
  }

  /**
   * Get module-wise revenue
   * GET /api/admin/module-revenue
   */
  async getModuleRevenue(req: Request, res: Response): Promise<void> {
    try {
      const moduleRevenue = await platformWalletService.getModuleWiseRevenue();

      res.status(200).json({
        success: true,
        data: moduleRevenue,
      });
    } catch (error: any) {
      console.error('Get module revenue error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch module revenue',
        message: error.message,
      });
    }
  }

  /**
   * Transfer tax to government
   * POST /api/admin/transfer-tax
   */
  async transferTaxToGovernment(req: Request, res: Response): Promise<void> {
    try {
      const { amount, referenceId, metadata } = req.body;

      if (!amount || amount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Valid amount is required',
        });
        return;
      }

      if (!referenceId) {
        res.status(400).json({
          success: false,
          error: 'Reference ID is required',
        });
        return;
      }

      const result = await platformWalletService.transferTaxToGovernment(
        amount,
        referenceId,
        metadata
      );

      res.status(200).json({
        success: true,
        message: 'Tax transferred to government successfully',
        data: result,
      });
    } catch (error: any) {
      console.error('Transfer tax error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to transfer tax',
        message: error.message,
      });
    }
  }

  /**
   * Get dashboard summary
   * GET /api/admin/dashboard
   */
  async getDashboardSummary(req: Request, res: Response): Promise<void> {
    try {
      const [stats, moduleRevenue, wallets] = await Promise.all([
        platformWalletService.getPlatformStats(),
        platformWalletService.getModuleWiseRevenue(),
        platformWalletService.getAllPlatformWallets(),
      ]);

      res.status(200).json({
        success: true,
        data: {
          revenue: stats,
          moduleRevenue,
          wallets: wallets.map((w) => ({
            type: w.type,
            balance: w.balance.toString(),
          })),
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Get dashboard summary error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard summary',
        message: error.message,
      });
    }
  }
}

export default new AdminController();