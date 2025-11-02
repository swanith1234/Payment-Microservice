import { Request, Response } from 'express';
import { PayoutStatus, Payout, Wallet, PayoutItem } from '@prisma/client';
import payoutRepository from '../repositories/payout.repository';
import payoutService from '../services/payout.service';
import { formatPayoutResponse } from '../types/payout.types';

type PayoutWithRelations = Payout & {
  wallet: Wallet | null;
  items: PayoutItem[];
};

export class PayoutController {
  /**
   * Schedule a payout
   * POST /api/payouts/schedule
   */
  async schedulePayout(req: Request, res: Response): Promise<void> {
    try {
      const { instructorId, walletId, amount, scheduledAt, metadata } = req.body;

      if (!instructorId || !walletId || !amount) {
        res.status(400).json({
          success: false,
          error: 'Instructor ID, wallet ID, and amount are required',
        });
        return;
      }

      if (amount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Amount must be greater than 0',
        });
        return;
      }

      const payout = await payoutService.schedulePayout({
        instructorId,
        walletId,
        amount,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        metadata,
      });

      res.status(201).json({
        success: true,
        message: 'Payout scheduled successfully',
        data: formatPayoutResponse(payout),
      });
    } catch (error: any) {
      console.error('Schedule payout error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to schedule payout',
        message: error.message,
      });
    }
  }

  /**
   * Process a payout
   * POST /api/payouts/:id/process
   */
  async processPayout(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { bankDetails } = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid payout ID',
        });
        return;
      }

      const result = await payoutService.processPayout(id, bankDetails);

      res.status(200).json({
        success: true,
        message: 'Payout processed successfully',
        data: {
          payout: formatPayoutResponse(result.payout),
          transactionId: result.transaction.id,
        },
      });
    } catch (error: any) {
      console.error('Process payout error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process payout',
        message: error.message,
      });
    }
  }

  /**
   * Get payout by ID
   * GET /api/payouts/:id
   */
  async getPayoutById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid payout ID',
        });
        return;
      }

      const payout = await payoutRepository.findById(id) as PayoutWithRelations | null;

      if (!payout) {
        res.status(404).json({
          success: false,
          error: 'Payout not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          ...formatPayoutResponse(payout),
          wallet: payout.wallet,
          items: payout.items,
        },
      });
    } catch (error: any) {
      console.error('Get payout error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payout',
        message: error.message,
      });
    }
  }

  /**
   * Get payouts by instructor ID
   * GET /api/payouts/instructor/:instructorId
   */
  async getPayoutsByInstructorId(req: Request, res: Response): Promise<void> {
    try {
      const instructorId = parseInt(req.params.instructorId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (isNaN(instructorId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid instructor ID',
        });
        return;
      }

      const result = await payoutRepository.findByInstructorId(
        instructorId,
        page,
        limit
      );

      res.status(200).json({
        success: true,
        data: {
          payouts: result.payouts.map(formatPayoutResponse),
          pagination: {
            total: result.total,
            page: result.page,
            limit,
            totalPages: result.totalPages,
          },
        },
      });
    } catch (error: any) {
      console.error('Get payouts by instructor error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payouts',
        message: error.message,
      });
    }
  }

  /**
   * Get payouts with filters
   * GET /api/payouts?instructorId=1&status=PENDING
   */
  async getPayoutsWithFilters(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const filters: any = {};

      if (req.query.instructorId)
        filters.instructorId = parseInt(req.query.instructorId as string);
      if (req.query.walletId)
        filters.walletId = parseInt(req.query.walletId as string);
      if (req.query.status) filters.status = req.query.status as PayoutStatus;
      if (req.query.startDate)
        filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate)
        filters.endDate = new Date(req.query.endDate as string);

      const result = await payoutRepository.findWithFilters(filters, page, limit);

      res.status(200).json({
        success: true,
        data: {
          payouts: result.payouts.map(formatPayoutResponse),
          pagination: {
            total: result.total,
            page: result.page,
            limit,
            totalPages: result.totalPages,
          },
          filters,
        },
      });
    } catch (error: any) {
      console.error('Get payouts with filters error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payouts',
        message: error.message,
      });
    }
  }

  /**
   * Update payout status
   * PATCH /api/payouts/:id/status
   */
  async updatePayoutStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { status, referenceId, metadata } = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid payout ID',
        });
        return;
      }

      if (!status) {
        res.status(400).json({
          success: false,
          error: 'Status is required',
        });
        return;
      }

      const payout = await payoutRepository.updateStatus(id, status, {
        referenceId,
        metadata,
      });

      res.status(200).json({
        success: true,
        message: 'Payout status updated successfully',
        data: formatPayoutResponse(payout),
      });
    } catch (error: any) {
      console.error('Update payout status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update payout status',
        message: error.message,
      });
    }
  }

  /**
   * Cancel a payout
   * POST /api/payouts/:id/cancel
   */
  async cancelPayout(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid payout ID',
        });
        return;
      }

      const payout = await payoutService.cancelPayout(id, reason);

      res.status(200).json({
        success: true,
        message: 'Payout cancelled successfully',
        data: formatPayoutResponse(payout),
      });
    } catch (error: any) {
      console.error('Cancel payout error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel payout',
        message: error.message,
      });
    }
  }

  /**
   * Get available balance for payout
   * GET /api/payouts/wallet/:walletId/available-balance
   */
  async getAvailableBalance(req: Request, res: Response): Promise<void> {
    try {
      const walletId = parseInt(req.params.walletId);

      if (isNaN(walletId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid wallet ID',
        });
        return;
      }

      const balance = await payoutService.getAvailableBalance(walletId);

      res.status(200).json({
        success: true,
        data: balance,
      });
    } catch (error: any) {
      console.error('Get available balance error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch available balance',
        message: error.message,
      });
    }
  }

  /**
   * Get instructor payout statistics
   * GET /api/payouts/instructor/:instructorId/stats
   */
  async getInstructorStats(req: Request, res: Response): Promise<void> {
    try {
      const instructorId = parseInt(req.params.instructorId);

      if (isNaN(instructorId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid instructor ID',
        });
        return;
      }

      const stats = await payoutRepository.getInstructorStats(instructorId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Get instructor stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch instructor statistics',
        message: error.message,
      });
    }
  }

  /**
   * Calculate payout amount after fees
   * POST /api/payouts/calculate-amount
   */
  async calculatePayoutAmount(req: Request, res: Response): Promise<void> {
    try {
      const { grossAmount } = req.body;

      if (!grossAmount || grossAmount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Valid gross amount is required',
        });
        return;
      }

      const result = payoutService.calculatePayoutAmount(grossAmount);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Calculate payout amount error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate payout amount',
        message: error.message,
      });
    }
  }

  /**
   * Process all scheduled payouts (for cron job)
   * POST /api/payouts/process-scheduled
   */
  async processScheduledPayouts(req: Request, res: Response): Promise<void> {
    try {
      const result = await payoutService.processScheduledPayouts();

      res.status(200).json({
        success: true,
        message: 'Scheduled payouts processed',
        data: result,
      });
    } catch (error: any) {
      console.error('Process scheduled payouts error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process scheduled payouts',
        message: error.message,
      });
    }
  }

  /**
   * Retry failed payout
   * POST /api/payouts/:id/retry
   */
  async retryPayout(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid payout ID',
        });
        return;
      }

      const result = await payoutService.retryPayout(id);

      res.status(200).json({
        success: true,
        message: 'Payout retried successfully',
        data: {
          payout: formatPayoutResponse(result.payout),
          transactionId: result.transaction.id,
        },
      });
    } catch (error: any) {
      console.error('Retry payout error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retry payout',
        message: error.message,
      });
    }
  }
}

export default new PayoutController();