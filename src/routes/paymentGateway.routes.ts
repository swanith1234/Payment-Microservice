import { Router } from 'express';
import paymentGatewayController from '../controllers/paymentGateway.controller';
import { validateCreateGateway } from '../middlewares/validations.middleware';

const router = Router();

/**
 * @route   POST /api/gateways
 * @desc    Create payment gateway configuration
 * @access  Private (Admin)
 */
router.post('/', validateCreateGateway, (req, res) =>
  paymentGatewayController.createGateway(req, res)
);

/**
 * @route   GET /api/gateways
 * @desc    Get all payment gateways
 * @access  Private (Admin)
 */
router.get('/', (req, res) =>
  paymentGatewayController.getAllGateways(req, res)
);

/**
 * @route   GET /api/gateways/types
 * @desc    Get available gateway types
 * @access  Public
 */
router.get('/types', (req, res) =>
  paymentGatewayController.getGatewayTypes(req, res)
);

/**
 * @route   GET /api/gateways/active
 * @desc    Get active payment gateways
 * @access  Private
 */
router.get('/active', (req, res) =>
  paymentGatewayController.getActiveGateways(req, res)
);

/**
 * @route   GET /api/gateways/default
 * @desc    Get default payment gateway
 * @access  Private
 */
router.get('/default', (req, res) =>
  paymentGatewayController.getDefaultGateway(req, res)
);

/**
 * @route   GET /api/gateways/:id
 * @desc    Get payment gateway by ID
 * @access  Private (Admin)
 */
router.get('/:id', (req, res) =>
  paymentGatewayController.getGatewayById(req, res)
);

/**
 * @route   PATCH /api/gateways/:id
 * @desc    Update payment gateway
 * @access  Private (Admin)
 */
router.patch('/:id', (req, res) =>
  paymentGatewayController.updateGateway(req, res)
);

/**
 * @route   DELETE /api/gateways/:id
 * @desc    Delete payment gateway
 * @access  Private (Admin)
 */
router.delete('/:id', (req, res) =>
  paymentGatewayController.deleteGateway(req, res)
);

/**
 * @route   PATCH /api/gateways/:id/toggle
 * @desc    Toggle gateway active status
 * @access  Private (Admin)
 */
router.patch('/:id/toggle', (req, res) =>
  paymentGatewayController.toggleGateway(req, res)
);

/**
 * @route   PATCH /api/gateways/:id/set-default
 * @desc    Set gateway as default
 * @access  Private (Admin)
 */
router.patch('/:id/set-default', (req, res) =>
  paymentGatewayController.setDefaultGateway(req, res)
);

export default router;