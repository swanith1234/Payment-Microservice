import { Request, Response } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import { WalletType } from '@prisma/client';
import walletRepository from '../repositories/wallet.repository';
import { CreateWalletDTO, UpdateWalletBalanceDTO, formatWalletResponse } from '../types/wallet.types';

export class WalletController {
  /**
   * Create a new wallet
   * POST /api/wallets
   */
  async createWallet(req: Request, res: Response): Promise<void> {
    try {
      const { userId, balance, currency, type }: CreateWalletDTO = req.body;

      // Validate required fields
      if (!type) {
        res.status(400).json({
          success: false,
          error: 'Wallet type is required',
        });
        return;
      }

      // Create wallet
      const wallet = await walletRepository.create({
        userId,
        balance: balance ? new Decimal(balance) : new Decimal(0),
        currency: currency || 'INR',
        type,
      });

      res.status(201).json({
        success: true,
        message: 'Wallet created successfully',
        data: formatWalletResponse(wallet),
      });
    } catch (error: any) {
      console.error('Create wallet error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create wallet',
        message: error.message,
      });
    }
  }

  /**
   * Get wallet by ID
   * GET /api/wallets/:id
   */
  async getWalletById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid wallet ID',
        });
        return;
      }

      const wallet = await walletRepository.findById(id);

      if (!wallet) {
        res.status(404).json({
          success: false,
          error: 'Wallet not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          ...formatWalletResponse(wallet),
          transactions: (wallet as any).transactions ?? [],
        },
      });
    } catch (error: any) {
      console.error('Get wallet error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch wallet',
        message: error.message,
      });
    }
  }

  /**
   * Get wallets by user ID
   * GET /api/wallets/user/:userId
   */
  async getWalletsByUserId(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID',
        });
        return;
      }

      const wallets = await walletRepository.findByUserId(userId);

      res.status(200).json({
        success: true,
        data: wallets.map((wallet) => ({
          ...formatWalletResponse(wallet),
          transactions: (wallet as any).transactions ?? [],
        })),
      });
    } catch (error: any) {
      console.error('Get wallets by user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user wallets',
        message: error.message,
      });
    }
  }

  /**
   * Get all wallets with pagination
   * GET /api/wallets?page=1&limit=10
   */
  async getAllWallets(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await walletRepository.findAll(page, limit);

      res.status(200).json({
        success: true,
        data: {
          wallets: result.wallets.map(formatWalletResponse),
          pagination: {
            total: result.total,
            page: result.page,
            limit,
            totalPages: result.totalPages,
          },
        },
      });
    } catch (error: any) {
      console.error('Get all wallets error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch wallets',
        message: error.message,
      });
    }
  }

  /**
   * Update wallet balance
   * PATCH /api/wallets/:id/balance
   */
  async updateWalletBalance(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { amount, operation }: UpdateWalletBalanceDTO = req.body;

      // Validation
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid wallet ID',
        });
        return;
      }

      if (!amount || amount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Amount must be greater than 0',
        });
        return;
      }

      if (!operation || !['ADD', 'SUBTRACT'].includes(operation)) {
        res.status(400).json({
          success: false,
          error: 'Operation must be ADD or SUBTRACT',
        });
        return;
      }

      // Check if wallet exists
      const existingWallet = await walletRepository.findById(id);
      if (!existingWallet) {
        res.status(404).json({
          success: false,
          error: 'Wallet not found',
        });
        return;
      }

      // Check sufficient balance for SUBTRACT operation
      if (operation === 'SUBTRACT') {
        const hasSufficientBalance = await walletRepository.hasSufficientBalance(
          id,
          new Decimal(amount)
        );

        if (!hasSufficientBalance) {
          res.status(400).json({
            success: false,
            error: 'Insufficient wallet balance',
          });
          return;
        }
      }

      // Update balance
      const prismaOperation = operation === 'ADD' ? 'increment' : 'decrement';
      const updatedWallet = await walletRepository.updateBalance(
        id,
        new Decimal(amount),
        prismaOperation
      );

      res.status(200).json({
        success: true,
        message: 'Wallet balance updated successfully',
        data: formatWalletResponse(updatedWallet),
      });
    } catch (error: any) {
      console.error('Update wallet balance error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update wallet balance',
        message: error.message,
      });
    }
  }

  /**
   * Get wallet balance
   * GET /api/wallets/:id/balance
   */
  async getWalletBalance(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid wallet ID',
        });
        return;
      }

      const balance = await walletRepository.getBalance(id);

      if (balance === null) {
        res.status(404).json({
          success: false,
          error: 'Wallet not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          balance: balance.toString(),
        },
      });
    } catch (error: any) {
      console.error('Get wallet balance error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch wallet balance',
        message: error.message,
      });
    }
  }
}

export default new WalletController();