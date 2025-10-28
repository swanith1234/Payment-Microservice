import { Request, Response } from 'express';
import paymentGatewayRepository from '../repositories/paymentGateway.repository';
import paymentService from '../services/payment.service';
import gatewayFactory from '../services/gatewayFactory.service';
import { formatPaymentGatewayResponse } from '../types/paymentGateway.types';

export class PaymentGatewayController {
  /**
   * Create payment gateway configuration
   * POST /api/gateways
   */
  async createGateway(req: Request, res: Response): Promise<void> {
    try {
      const { name, type, credentials, isActive, isDefault } = req.body;

      if (!name || !type || !credentials) {
        res.status(400).json({
          success: false,
          error: 'Name, type, and credentials are required',
        });
        return;
      }

      const gateway = await paymentGatewayRepository.create({
        name,
        type,
        credentials,
        isActive,
        isDefault,
      });

      // Clear provider cache
      gatewayFactory.clearCache();

      res.status(201).json({
        success: true,
        message: 'Payment gateway created successfully',
        data: formatPaymentGatewayResponse(gateway),
      });
    } catch (error: any) {
      console.error('Create gateway error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create payment gateway',
        message: error.message,
      });
    }
  }

  /**
   * Get all payment gateways
   * GET /api/gateways
   */
  async getAllGateways(req: Request, res: Response): Promise<void> {
    try {
      const gateways = await paymentGatewayRepository.findAll();

      res.status(200).json({
        success: true,
        data: gateways.map(formatPaymentGatewayResponse),
      });
    } catch (error: any) {
      console.error('Get all gateways error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payment gateways',
        message: error.message,
      });
    }
  }

  /**
   * Get active payment gateways
   * GET /api/gateways/active
   */
  async getActiveGateways(req: Request, res: Response): Promise<void> {
    try {
      const gateways = await paymentGatewayRepository.findAllActive();

      res.status(200).json({
        success: true,
        data: gateways.map(formatPaymentGatewayResponse),
      });
    } catch (error: any) {
      console.error('Get active gateways error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch active payment gateways',
        message: error.message,
      });
    }
  }

  /**
   * Get gateway by ID
   * GET /api/gateways/:id
   */
  async getGatewayById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid gateway ID',
        });
        return;
      }

      const gateway = await paymentGatewayRepository.findById(id);

      if (!gateway) {
        res.status(404).json({
          success: false,
          error: 'Payment gateway not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: formatPaymentGatewayResponse(gateway),
      });
    } catch (error: any) {
      console.error('Get gateway error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payment gateway',
        message: error.message,
      });
    }
  }

  /**
   * Get default gateway
   * GET /api/gateways/default
   */
  async getDefaultGateway(req: Request, res: Response): Promise<void> {
    try {
      const gateway = await paymentGatewayRepository.getDefault();

      if (!gateway) {
        res.status(404).json({
          success: false,
          error: 'No default payment gateway configured',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: formatPaymentGatewayResponse(gateway),
      });
    } catch (error: any) {
      console.error('Get default gateway error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch default payment gateway',
        message: error.message,
      });
    }
  }

  /**
   * Update payment gateway
   * PATCH /api/gateways/:id
   */
  async updateGateway(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { name, credentials, isActive, isDefault } = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid gateway ID',
        });
        return;
      }

      const gateway = await paymentGatewayRepository.update(id, {
        name,
        credentials,
        isActive,
        isDefault,
      });

      // Clear provider cache for this gateway
      gatewayFactory.clearCache(id);

      res.status(200).json({
        success: true,
        message: 'Payment gateway updated successfully',
        data: formatPaymentGatewayResponse(gateway),
      });
    } catch (error: any) {
      console.error('Update gateway error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update payment gateway',
        message: error.message,
      });
    }
  }

  /**
   * Delete payment gateway
   * DELETE /api/gateways/:id
   */
  async deleteGateway(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid gateway ID',
        });
        return;
      }

      await paymentGatewayRepository.delete(id);

      // Clear provider cache
      gatewayFactory.clearCache(id);

      res.status(200).json({
        success: true,
        message: 'Payment gateway deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete gateway error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete payment gateway',
        message: error.message,
      });
    }
  }

  /**
   * Toggle gateway active status
   * PATCH /api/gateways/:id/toggle
   */
  async toggleGateway(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid gateway ID',
        });
        return;
      }

      const gateway = await paymentGatewayRepository.toggleActive(id);

      // Clear provider cache
      gatewayFactory.clearCache(id);

      res.status(200).json({
        success: true,
        message: `Gateway ${gateway.isActive ? 'activated' : 'deactivated'} successfully`,
        data: formatPaymentGatewayResponse(gateway),
      });
    } catch (error: any) {
      console.error('Toggle gateway error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle gateway status',
        message: error.message,
      });
    }
  }

  /**
   * Set gateway as default
   * PATCH /api/gateways/:id/set-default
   */
  async setDefaultGateway(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid gateway ID',
        });
        return;
      }

      const gateway = await paymentGatewayRepository.setAsDefault(id);

      res.status(200).json({
        success: true,
        message: 'Default gateway set successfully',
        data: formatPaymentGatewayResponse(gateway),
      });
    } catch (error: any) {
      console.error('Set default gateway error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set default gateway',
        message: error.message,
      });
    }
  }

  /**
   * Get available gateway types
   * GET /api/gateways/types
   */
  async getGatewayTypes(req: Request, res: Response): Promise<void> {
    try {
      const types = gatewayFactory.getAvailableGatewayTypes();

      res.status(200).json({
        success: true,
        data: types,
      });
    } catch (error: any) {
      console.error('Get gateway types error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch gateway types',
        message: error.message,
      });
    }
  }
}

export default new PaymentGatewayController();