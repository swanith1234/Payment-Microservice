import { Request, Response, NextFunction } from 'express'

/**
 * Validation schemas
 */
export const validationSchemas = {
  createWallet: {
    type: { type: 'string', required: true },
    userId: { type: 'number', required: false },
    balance: { type: 'number', required: false, min: 0 },
    currency: { type: 'string', required: false },
  },
  updateBalance: {
    amount: { type: 'number', required: true, min: 0.01 },
    operation: { type: 'string', required: true, enum: ['ADD', 'SUBTRACT'] },
  },
  createTransaction: {
    type: {
      type: 'string',
      required: true,
      enum: [
        'CHARGE',
        'REFUND',
        'COMMISSION',
        'TAX',
        'NET_PAYOUT',
        'PAYOUT',
        'ADJUSTMENT',
      ],
    },
    amount: { type: 'number', required: true, min: 0.01 },
    currency: { type: 'string', required: false },
    userId: { type: 'number', required: false },
    walletId: { type: 'number', required: false },
    paymentMethod: {
      type: 'string',
      required: false,
      enum: ['CARD', 'UPI', 'WALLET', 'NETBANKING', 'OTHER'],
    },
    externalId: { type: 'string', required: false },
  },
  updateTransactionStatus: {
    status: {
      type: 'string',
      required: true,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
    },
  },
  calculateNet: {
    grossAmount: { type: 'number', required: true, min: 0.01 },
    commissionPercent: { type: 'number', required: false, min: 0, max: 100 },
    taxPercent: { type: 'number', required: false, min: 0, max: 100 },
  },
  createGateway: {
    name: { type: 'string', required: true, minLength: 3 },
    type: { type: 'string', required: true, enum: ['RAZORPAY', 'STRIPE', 'PAYU'] },
    credentials: { type: 'object', required: true },
  },
  createOrder: {
    amount: { type: 'number', required: true, min: 1 },
    currency: { type: 'string', required: false },
    userId: { type: 'number', required: false },
    walletId: { type: 'number', required: false },
  },
  verifyPayment: {
    razorpay_order_id: { type: 'string', required: true },
    razorpay_payment_id: { type: 'string', required: true },
    razorpay_signature: { type: 'string', required: true },
  },
  createPaymentLink: {
    amount: { type: 'number', required: true, min: 1 },
    description: { type: 'string', required: false },
  },
  schedulePayout: {
    instructorId: { type: 'number', required: true },
    walletId: { type: 'number', required: true },
    amount: { type: 'number', required: true, min: 1 },
    scheduledAt: { type: 'string', required: false },
  },
  updatePayoutStatus: {
    status: {
      type: 'string',
      required: true,
      enum: ['PENDING', 'SCHEDULED', 'PROCESSING', 'COMPLETED', 'FAILED'],
    },
  },
  calculatePayoutAmount: {
    grossAmount: { type: 'number', required: true, min: 1 },
  },
}

/**
 * Generic validation middleware factory
 */
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = []

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field]
      const fieldRules = rules as any

      // Required check
      if (fieldRules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`)
        continue
      }

      if (!fieldRules.required && (value === undefined || value === null)) {
        continue
      }

      // Type check
      if (fieldRules.type === 'string' && typeof value !== 'string') {
        errors.push(`${field} must be a string`)
      }
      if (fieldRules.type === 'object' && typeof value !== 'object') {
        errors.push(`${field} must be an object`)
      }
      if (fieldRules.type === 'number') {
        const numValue = Number(value)
        if (isNaN(numValue)) {
          errors.push(`${field} must be a number`)
        } else {
          if (fieldRules.min !== undefined && numValue < fieldRules.min) {
            errors.push(`${field} must be at least ${fieldRules.min}`)
          }
          if (fieldRules.max !== undefined && numValue > fieldRules.max) {
            errors.push(`${field} must be at most ${fieldRules.max}`)
          }
        }
      }

      // Enum check
      if (fieldRules.enum && !fieldRules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${fieldRules.enum.join(', ')}`)
      }

      // String length check
      if (fieldRules.minLength && value.length < fieldRules.minLength) {
        errors.push(`${field} must be at least ${fieldRules.minLength} characters`)
      }
      if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
        errors.push(`${field} must be at most ${fieldRules.maxLength} characters`)
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      })
      return
    }

    next()
  }
}

/**
 * Specific validation middlewares
 */
export const validateCreateWallet = validateRequest(validationSchemas.createWallet)
export const validateUpdateBalance = validateRequest(validationSchemas.updateBalance)
export const validateCreateTransaction = validateRequest(validationSchemas.createTransaction)
export const validateUpdateTransactionStatus = validateRequest(validationSchemas.updateTransactionStatus)
export const validateCalculateNet = validateRequest(validationSchemas.calculateNet)
export const validateCreateGateway = validateRequest(validationSchemas.createGateway)
export const validateCreateOrder = validateRequest(validationSchemas.createOrder)
export const validateVerifyPayment = validateRequest(validationSchemas.verifyPayment)
export const validateCreatePaymentLink = validateRequest(validationSchemas.createPaymentLink)
export const validateSchedulePayout = validateRequest(validationSchemas.schedulePayout)
export const validateUpdatePayoutStatus = validateRequest(validationSchemas.updatePayoutStatus)
export const validateCalculatePayoutAmount = validateRequest(validationSchemas.calculatePayoutAmount)
