import { PrismaClient, PaymentGateway } from '@prisma/client';
import prisma from '../database/prismaClient';

export class PaymentGatewayRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Create a payment gateway configuration
   */
  async create(data: {
    name: string;
    type: string;
    credentials: any;
    isActive?: boolean;
    isDefault?: boolean;
  }): Promise<PaymentGateway> {
    // If this gateway is set as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.paymentGateway.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return await this.prisma.paymentGateway.create({
      data: {
        name: data.name,
        type: data.type,
        credentials: data.credentials,
        isActive: data.isActive !== false,
        isDefault: data.isDefault || false,
      },
    });
  }

  /**
   * Find gateway by ID
   */
  async findById(id: number): Promise<PaymentGateway | null> {
    return await this.prisma.paymentGateway.findUnique({
      where: { id },
    });
  }

  /**
   * Find gateway by type
   */
  async findByType(type: string): Promise<PaymentGateway | null> {
    return await this.prisma.paymentGateway.findFirst({
      where: { type, isDefault: true},
      // where: { type, isActive: true },
    });
  }

  /**
   * Get default gateway
   */
  async getDefault(): Promise<PaymentGateway | null> {
    return await this.prisma.paymentGateway.findFirst({
      where: { isDefault: true, isActive: true },
    });
  }

  /**
   * Get all active gateways
   */
  async findAllActive(): Promise<PaymentGateway[]> {
    return await this.prisma.paymentGateway.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all gateways
   */
  async findAll(): Promise<PaymentGateway[]> {
    return await this.prisma.paymentGateway.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update gateway
   */
  async update(
    id: number,
    data: {
      name?: string;
      credentials?: any;
      isActive?: boolean;
      isDefault?: boolean;
    }
  ): Promise<PaymentGateway> {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.paymentGateway.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return await this.prisma.paymentGateway.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete gateway
   */
  async delete(id: number): Promise<PaymentGateway> {
    return await this.prisma.paymentGateway.delete({
      where: { id },
    });
  }

  /**
   * Toggle gateway active status
   */
  async toggleActive(id: number): Promise<PaymentGateway> {
    const gateway = await this.findById(id);
    if (!gateway) {
      throw new Error('Gateway not found');
    }

    return await this.prisma.paymentGateway.update({
      where: { id },
      data: { isActive: !gateway.isActive },
    });
  }

  /**
   * Set as default gateway
   */
  async setAsDefault(id: number): Promise<PaymentGateway> {
    // Unset all defaults
    await this.prisma.paymentGateway.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });

    // Set new default
    return await this.prisma.paymentGateway.update({
      where: { id },
      data: { isDefault: true, isActive: true },
    });
  }
}

export default new PaymentGatewayRepository();