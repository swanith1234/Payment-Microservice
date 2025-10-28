import { Request, Response } from 'express';
import { PaymentStatus, Transaction, Wallet } from '@prisma/client';
import transactionRepository from '../repositories/transaction.repository';
import transactionService from '../services/transaction.service';
import { formatTransactionResponse } from '../types/transaction.types';

type TransactionWithWallet = Transaction & {
  wallet: Wallet | null;
};

export class TransactionController {
  /**
   * Create a new transaction
   * POST /api/transactions
   */
  async createTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { type, amount, currency, userId, walletId, paymentMethod, externalId, metadata } = req.body;

      // Validation
      if (!type || !amount) {
        res.status(400).json({
          success: false,
          error: 'Transaction type and amount are required',
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

      // Create transaction with wallet update
      const transaction = await transactionService.createTransactionWithWalletUpdate({
        type,
        amount,
        currency,
        userId,
        walletId,
        paymentMethod,
        externalId,
        metadata,
        autoUpdateWallet: false, // Don't auto-update, transaction is PENDING
      });

      res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        data: formatTransactionResponse(transaction),
      });
    } catch (error: any) {
      console.error('Create transaction error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create transaction',
        message: error.message,
      });
    }
  }

  /**
   * Get transaction by ID
   * GET /api/transactions/:id
   */
  async getTransactionById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid transaction ID',
        });
        return;
      }

      const transaction = await transactionRepository.findById(id) as TransactionWithWallet | null;

      if (!transaction) {
        res.status(404).json({
          success: false,
          error: 'Transaction not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          ...formatTransactionResponse(transaction),
          wallet: transaction.wallet,
        },
      });
    } catch (error: any) {
      console.error('Get transaction error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transaction',
        message: error.message,
      });
    }
  }

  /**
   * Refund a transaction
   * POST /api/transactions/:id/refund
   */
  async refundTransaction(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid transaction ID',
        });
        return;
      }

      if (!reason) {
        res.status(400).json({
          success: false,
          error: 'Refund reason is required',
        });
        return;
      }

      const result = await transactionService.processRefund(id, reason);

      res.status(200).json({
        success: true,
        message: 'Transaction refunded successfully',
        data: {
          refundTransaction: formatTransactionResponse(result.refundTransaction),
          originalTransaction: formatTransactionResponse(result.originalTransaction),
        },
      });
    } catch (error: any) {
      console.error('Refund transaction error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refund transaction',
        message: error.message,
      });
    }
  }

  /**
   * Get user transaction statistics
   * GET /api/transactions/user/:userId/stats
   */
  async getUserTransactionStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID',
        });
        return;
      }

      const stats = await transactionRepository.getUserStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user statistics',
        message: error.message,
      });
    }
  }

  /**
   * Get wallet transaction statistics
   * GET /api/transactions/wallet/:walletId/stats
   */
  async getWalletTransactionStats(req: Request, res: Response): Promise<void> {
    try {
      const walletId = parseInt(req.params.walletId);

      if (isNaN(walletId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid wallet ID',
        });
        return;
      }

      const stats = await transactionRepository.getWalletStats(walletId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Get wallet stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch wallet statistics',
        message: error.message,
      });
    }
  }

  /**
   * Calculate net amount after deductions
   * POST /api/transactions/calculate-net
   */
  async calculateNetAmount(req: Request, res: Response): Promise<void> {
    try {
      const { grossAmount, commissionPercent, taxPercent } = req.body;

      if (!grossAmount || grossAmount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Valid gross amount is required',
        });
        return;
      }

      const result = transactionService.calculateNetAmount(
        grossAmount,
        commissionPercent || 0,
        taxPercent || 0
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Calculate net amount error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate net amount',
        message: error.message,
      });
    }
  }

  /**
   * Get transaction by external ID
   * GET /api/transactions/external/:externalId
   */
  async getTransactionByExternalId(req: Request, res: Response): Promise<void> {
    try {
      const { externalId } = req.params;

      const transaction = await transactionRepository.findByExternalId(externalId);

      if (!transaction) {
        res.status(404).json({
          success: false,
          error: 'Transaction not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: formatTransactionResponse(transaction),
      });
    } catch (error: any) {
      console.error('Get transaction by external ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transaction',
        message: error.message,
      });
    }
  }

  /**
   * Get transactions by user ID
   * GET /api/transactions/user/:userId?page=1&limit=10
   */
  async getTransactionsByUserId(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID',
        });
        return;
      }

      const result = await transactionRepository.findByUserId(userId, page, limit);

      res.status(200).json({
        success: true,
        data: {
          transactions: result.transactions.map(formatTransactionResponse),
          pagination: {
            total: result.total,
            page: result.page,
            limit,
            totalPages: result.totalPages,
          },
        },
      });
    } catch (error: any) {
      console.error('Get transactions by user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transactions',
        message: error.message,
      });
    }
  }

  /**
   * Get transactions by wallet ID
   * GET /api/transactions/wallet/:walletId?page=1&limit=10
   */
  async getTransactionsByWalletId(req: Request, res: Response): Promise<void> {
    try {
      const walletId = parseInt(req.params.walletId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (isNaN(walletId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid wallet ID',
        });
        return;
      }

      const result = await transactionRepository.findByWalletId(walletId, page, limit);

      res.status(200).json({
        success: true,
        data: {
          transactions: result.transactions.map(formatTransactionResponse),
          pagination: {
            total: result.total,
            page: result.page,
            limit,
            totalPages: result.totalPages,
          },
        },
      });
    } catch (error: any) {
      console.error('Get transactions by wallet error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transactions',
        message: error.message,
      });
    }
  }

  /**
   * Get transactions with filters
   * GET /api/transactions?userId=1&status=SUCCESS&type=CHARGE&page=1&limit=10
   */
  async getTransactionsWithFilters(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const filters: any = {};

      if (req.query.userId) filters.userId = parseInt(req.query.userId as string);
      if (req.query.walletId) filters.walletId = parseInt(req.query.walletId as string);
      if (req.query.status) filters.status = req.query.status as PaymentStatus;
      if (req.query.type) filters.type = req.query.type;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);

      const result = await transactionRepository.findWithFilters(filters, page, limit);

      res.status(200).json({
        success: true,
        data: {
          transactions: result.transactions.map(formatTransactionResponse),
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
      console.error('Get transactions with filters error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transactions',
        message: error.message,
      });
    }
  }

  /**
   * Update transaction status
   * PATCH /api/transactions/:id/status
   */
  async updateTransactionStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { status, metadata } = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid transaction ID',
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

      const transaction = await transactionService.updateTransactionStatus(id, status, metadata);

      res.status(200).json({
        success: true,
        message: 'Transaction status updated successfully',
        data: formatTransactionResponse(transaction),
      });
    } catch (error: any) {
      console.error('Update transaction status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update transaction status',
        message: error.message,
      });
    }
  }
}

export default new TransactionController();
