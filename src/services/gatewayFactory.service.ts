import { PaymentGateway } from '@prisma/client';
import { RazorpayProvider } from './razorpay.provider';
import { IGatewayProvider, GatewayType } from '../types/paymentGateway.types';
import paymentGatewayRepository from '../repositories/paymentGateway.repository';

export class GatewayFactoryService {
  private providers: Map<number, IGatewayProvider> = new Map();

  /**
   * Get gateway provider by gateway ID
   */
  async getProvider(gatewayId?: number): Promise<{
    provider: IGatewayProvider;
    gateway: PaymentGateway;
  }> {
    let gateway: PaymentGateway | null;

    // If gatewayId provided, use that gateway
    if (gatewayId) {
      gateway = await paymentGatewayRepository.findById(gatewayId);
    } else {
      // Otherwise, use default gateway
      gateway = await paymentGatewayRepository.getDefault();
    }

    if (!gateway) {
      throw new Error('No payment gateway configured');
    }

    if (!gateway.isActive) {
      throw new Error('Payment gateway is not active');
    }

    // Check if provider already exists in cache
    if (this.providers.has(gateway.id)) {
      return {
        provider: this.providers.get(gateway.id)!,
        gateway,
      };
    }

    // Create new provider instance
    const provider = this.createProvider(gateway);
    this.providers.set(gateway.id, provider);

    return { provider, gateway };
  }

  /**
   * Get provider by gateway type
   */
  async getProviderByType(type: string): Promise<{
    provider: IGatewayProvider;
    gateway: PaymentGateway;
  }> {
    const gateway = await paymentGatewayRepository.findByType(type);

    if (!gateway) {
      throw new Error(`No ${type} gateway configured`);
    }

    if (!gateway.isActive) {
      throw new Error(`${type} gateway is not active`);
    }

    // Check cache
    if (this.providers.has(gateway.id)) {
      return {
        provider: this.providers.get(gateway.id)!,
        gateway,
      };
    }

    // Create new provider
    const provider = this.createProvider(gateway);
    this.providers.set(gateway.id, provider);

    return { provider, gateway };
  }

  /**
   * Create provider instance based on gateway type
   */
  private createProvider(gateway: PaymentGateway): IGatewayProvider {
    const credentials = gateway.credentials as any;

    switch (gateway.type) {
      case GatewayType.RAZORPAY:
        return new RazorpayProvider({
          keyId: credentials.keyId,
          keySecret: credentials.keySecret,
          webhookSecret: credentials.webhookSecret,
        });

      case GatewayType.STRIPE:
        // Future implementation
        throw new Error('Stripe integration not yet implemented');

      case GatewayType.PAYU:
        // Future implementation
        throw new Error('PayU integration not yet implemented');

      default:
        throw new Error(`Unsupported gateway type: ${gateway.type}`);
    }
  }

  /**
   * Clear provider cache (useful after gateway update)
   */
  clearCache(gatewayId?: number): void {
    if (gatewayId) {
      this.providers.delete(gatewayId);
    } else {
      this.providers.clear();
    }
  }

  /**
   * Get all available gateway types
   */
  getAvailableGatewayTypes(): string[] {
    return Object.values(GatewayType);
  }
}

export default new GatewayFactoryService();