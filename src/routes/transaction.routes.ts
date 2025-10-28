import { Router } from 'express';
import transactionController from '../controllers/transaction.controller';
import { 
  validateCreateTransaction, 
  validateUpdateTransactionStatus,
  validateCalculateNet 
} from '../middlewares/validations.middleware';

const router = Router();

/**
 * @route   POST /api/transactions
 * @desc    Create a new transaction
 * @access  Private
 */
router.post('/', validateCreateTransaction, (req, res) => 
  transactionController.createTransaction(req, res)
);

/**
 * @route   GET /api/transactions
 * @desc    Get transactions with filters
 * @access  Private
 * @query   userId, walletId, status, type, startDate, endDate, page, limit
 */
router.get('/', (req, res) => 
  transactionController.getTransactionsWithFilters(req, res)
);

/**
 * @route   GET /api/transactions/:id
 * @desc    Get transaction by ID
 * @access  Private
 */
router.get('/:id', (req, res) => 
  transactionController.getTransactionById(req, res)
);

/**
 * @route   GET /api/transactions/external/:externalId
 * @desc    Get transaction by external ID (payment gateway ID)
 * @access  Private
 */
router.get('/external/:externalId', (req, res) => 
  transactionController.getTransactionByExternalId(req, res)
);

/**
 * @route   GET /api/transactions/user/:userId
 * @desc    Get transactions by user ID
 * @access  Private
 * @query   page, limit
 */
router.get('/user/:userId', (req, res) => 
  transactionController.getTransactionsByUserId(req, res)
);

/**
 * @route   GET /api/transactions/user/:userId/stats
 * @desc    Get transaction statistics for a user
 * @access  Private
 */
router.get('/user/:userId/stats', (req, res) => 
  transactionController.getUserTransactionStats(req, res)
);

/**
 * @route   GET /api/transactions/wallet/:walletId
 * @desc    Get transactions by wallet ID
 * @access  Private
 * @query   page, limit
 */
router.get('/wallet/:walletId', (req, res) => 
  transactionController.getTransactionsByWalletId(req, res)
);

/**
 * @route   GET /api/transactions/wallet/:walletId/stats
 * @desc    Get transaction statistics for a wallet
 * @access  Private
 */
router.get('/wallet/:walletId/stats', (req, res) => 
  transactionController.getWalletTransactionStats(req, res)
);

/**
 * @route   PATCH /api/transactions/:id/status
 * @desc    Update transaction status
 * @access  Private
 */
router.patch('/:id/status', validateUpdateTransactionStatus, (req, res) => 
  transactionController.updateTransactionStatus(req, res)
);

/**
 * @route   POST /api/transactions/:id/refund
 * @desc    Refund a transaction
 * @access  Private
 */
router.post('/:id/refund', (req, res) => 
  transactionController.refundTransaction(req, res)
);

/**
 * @route   POST /api/transactions/calculate-net
 * @desc    Calculate net amount after deductions
 * @access  Public (utility endpoint)
 */
router.post('/calculate-net', validateCalculateNet, (req, res) => 
  transactionController.calculateNetAmount(req, res)
);

export default router;