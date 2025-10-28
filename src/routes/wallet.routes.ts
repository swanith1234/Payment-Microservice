import { Router } from 'express';
import walletController from '../controllers/wallet.controller';
import { validateCreateWallet, validateUpdateBalance } from '../middlewares/validations.middleware';

const router = Router();

/**
 * @route   POST /api/wallets
 * @desc    Create a new wallet
 * @access  Private
 */
router.post('/', validateCreateWallet, (req, res) => 
  walletController.createWallet(req, res)
);

/**
 * @route   GET /api/wallets
 * @desc    Get all wallets with pagination
 * @access  Private
 * @query   page (default: 1), limit (default: 10)
 */
router.get('/', (req, res) => 
  walletController.getAllWallets(req, res)
);

/**
 * @route   GET /api/wallets/:id
 * @desc    Get wallet by ID
 * @access  Private
 */
router.get('/:id', (req, res) => 
  walletController.getWalletById(req, res)
);

/**
 * @route   GET /api/wallets/user/:userId
 * @desc    Get all wallets for a specific user
 * @access  Private
 */
router.get('/user/:userId', (req, res) => 
  walletController.getWalletsByUserId(req, res)
);

/**
 * @route   GET /api/wallets/:id/balance
 * @desc    Get wallet balance only
 * @access  Private
 */
router.get('/:id/balance', (req, res) => 
  walletController.getWalletBalance(req, res)
);

/**
 * @route   PATCH /api/wallets/:id/balance
 * @desc    Update wallet balance (add or subtract)
 * @access  Private
 */
router.patch('/:id/balance', validateUpdateBalance, (req, res) => 
  walletController.updateWalletBalance(req, res)
);

export default router;