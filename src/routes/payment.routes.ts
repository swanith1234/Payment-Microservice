import { Router } from 'express';
import paymentController from '../controllers/payment.controller';
import {
  validateCreateOrder,
  validateVerifyPayment,
  validateCreatePaymentLink,
} from '../middlewares/validations.middleware';

const router = Router();

/**
 * @route   POST /api/payments/create-order
 * @desc    Create payment order (Razorpay order)
 * @access  Private
 */
router.post('/create-order', validateCreateOrder, (req, res) =>
  paymentController.createOrder(req, res)
);

/**
 * @route   POST /api/payments/verify
 * @desc    Verify payment after successful payment
 * @access  Private
 */
router.post('/verify', validateVerifyPayment, (req, res) =>
  paymentController.verifyPayment(req, res)
);

/**
 * @route   POST /api/payments/webhook/:gatewayType
 * @desc    Handle payment gateway webhooks
 * @access  Public (called by payment gateway)
 */
router.post('/webhook/:gatewayType', (req, res) =>
  paymentController.handleWebhook(req, res)
);

/**
 * @route   POST /api/payments/create-link
 * @desc    Create payment link
 * @access  Private
 */
router.post('/create-link', validateCreatePaymentLink, (req, res) =>
  paymentController.createPaymentLink(req, res)
);

/**
 * @route   POST /api/payments/refund/:transactionId
 * @desc    Initiate refund through payment gateway
 * @access  Private
 */
router.post('/refund/:transactionId', (req, res) =>
  paymentController.initiateRefund(req, res)
);

export default router;