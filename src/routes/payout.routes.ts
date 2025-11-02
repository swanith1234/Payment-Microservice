import { Router } from 'express';
import payoutController from '../controllers/payout.controller';
import {
  validateSchedulePayout,
  validateUpdatePayoutStatus,
  validateCalculatePayoutAmount,
} from '../middlewares/validations.middleware';

const router = Router();

/**
 * @route   POST /api/payouts/schedule
 * @desc    Schedule a payout for an instructor
 * @access  Private
 */
router.post('/schedule', validateSchedulePayout, (req, res) =>
  payoutController.schedulePayout(req, res)
);

/**
 * @route   GET /api/payouts
 * @desc    Get payouts with filters
 * @access  Private
 * @query   instructorId, walletId, status, startDate, endDate, page, limit
 */
router.get('/', (req, res) =>
  payoutController.getPayoutsWithFilters(req, res)
);

/**
 * @route   GET /api/payouts/:id
 * @desc    Get payout by ID
 * @access  Private
 */
router.get('/:id', (req, res) =>
  payoutController.getPayoutById(req, res)
);

/**
 * @route   GET /api/payouts/instructor/:instructorId
 * @desc    Get payouts by instructor ID
 * @access  Private
 * @query   page, limit
 */
router.get('/instructor/:instructorId', (req, res) =>
  payoutController.getPayoutsByInstructorId(req, res)
);

/**
 * @route   GET /api/payouts/instructor/:instructorId/stats
 * @desc    Get payout statistics for instructor
 * @access  Private
 */
router.get('/instructor/:instructorId/stats', (req, res) =>
  payoutController.getInstructorStats(req, res)
);

/**
 * @route   GET /api/payouts/wallet/:walletId/available-balance
 * @desc    Get available balance for payout
 * @access  Private
 */
router.get('/wallet/:walletId/available-balance', (req, res) =>
  payoutController.getAvailableBalance(req, res)
);

/**
 * @route   POST /api/payouts/:id/process
 * @desc    Process a payout (transfer to bank)
 * @access  Private (Admin)
 */
router.post('/:id/process', (req, res) =>
  payoutController.processPayout(req, res)
);

/**
 * @route   POST /api/payouts/:id/cancel
 * @desc    Cancel a payout
 * @access  Private
 */
router.post('/:id/cancel', (req, res) =>
  payoutController.cancelPayout(req, res)
);

/**
 * @route   POST /api/payouts/:id/retry
 * @desc    Retry a failed payout
 * @access  Private (Admin)
 */
router.post('/:id/retry', (req, res) =>
  payoutController.retryPayout(req, res)
);

/**
 * @route   PATCH /api/payouts/:id/status
 * @desc    Update payout status
 * @access  Private (Admin)
 */
router.patch('/:id/status', validateUpdatePayoutStatus, (req, res) =>
  payoutController.updatePayoutStatus(req, res)
);

/**
 * @route   POST /api/payouts/calculate-amount
 * @desc    Calculate payout amount after fees
 * @access  Public (utility endpoint)
 */
router.post('/calculate-amount', validateCalculatePayoutAmount, (req, res) =>
  payoutController.calculatePayoutAmount(req, res)
);

/**
 * @route   POST /api/payouts/process-scheduled
 * @desc    Process all scheduled payouts (cron job)
 * @access  Private (Admin/Cron)
 */
router.post('/process-scheduled', (req, res) =>
  payoutController.processScheduledPayouts(req, res)
);

export default router;