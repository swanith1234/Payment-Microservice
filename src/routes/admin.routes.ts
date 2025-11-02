import { Router } from 'express';
import adminController from '../controllers/admin.controller';

const router = Router();

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get complete dashboard summary
 * @access  Private (Admin)
 */
router.get('/dashboard', (req, res) =>
  adminController.getDashboardSummary(req, res)
);

/**
 * @route   GET /api/admin/platform-stats
 * @desc    Get platform revenue statistics
 * @access  Private (Admin)
 */
router.get('/platform-stats', (req, res) =>
  adminController.getPlatformStats(req, res)
);

/**
 * @route   GET /api/admin/commission-balance
 * @desc    Get commission wallet balance
 * @access  Private (Admin)
 */
router.get('/commission-balance', (req, res) =>
  adminController.getCommissionBalance(req, res)
);

/**
 * @route   GET /api/admin/tax-balance
 * @desc    Get tax wallet balance
 * @access  Private (Admin)
 */
router.get('/tax-balance', (req, res) =>
  adminController.getTaxBalance(req, res)
);

/**
 * @route   GET /api/admin/platform-wallets
 * @desc    Get all platform wallets
 * @access  Private (Admin)
 */
router.get('/platform-wallets', (req, res) =>
  adminController.getPlatformWallets(req, res)
);

/**
 * @route   GET /api/admin/revenue-breakdown
 * @desc    Get detailed revenue breakdown
 * @access  Private (Admin)
 * @query   startDate, endDate (optional)
 */
router.get('/revenue-breakdown', (req, res) =>
  adminController.getRevenueBreakdown(req, res)
);

/**
 * @route   GET /api/admin/module-revenue
 * @desc    Get module-wise revenue
 * @access  Private (Admin)
 */
router.get('/module-revenue', (req, res) =>
  adminController.getModuleRevenue(req, res)
);

/**
 * @route   POST /api/admin/transfer-tax
 * @desc    Transfer tax to government
 * @access  Private (Admin)
 */
router.post('/transfer-tax', (req, res) =>
  adminController.transferTaxToGovernment(req, res)
);

export default router;