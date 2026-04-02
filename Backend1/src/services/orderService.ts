import prisma from '../config/db';
import { AppError } from '../utils/AppError';

export const orderService = {
  calculateOrderTotal: async (items: { productId: string; quantity: number }[]): Promise<number> => {
    let total = 0;
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new AppError(`Product not found: ${item.productId}`, 404);
      total += product.price * item.quantity;
    }
    return total;
  },
  calculateKartCoins: (total: number): number => Math.floor(total * 0.1),
  calculateCourierEarnings: (total: number): number => Math.floor(total * 0.15) + 20,
  validateSingleVendorCart: async (items: { productId: string }[]): Promise<string> => {
    if (items.length === 0) throw new AppError('Cart is empty', 400);
    const productIds = items.map(i => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    if (products.length !== productIds.length) throw new AppError('Some products not found', 404);
    
    const vendorIds = new Set(products.map(p => p.vendorId));
    if (vendorIds.size > 1) throw new AppError('All products must be from the same vendor', 400);
    return [...vendorIds][0];
  },
  processOrderDelivery: async (orderId: string): Promise<void> => {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError('Order not found', 404);
    
    // update vendor stats
    await prisma.vendor.update({
      where: { id: order.vendorId },
      data: {
        totalOrders: { increment: 1 },
        totalEarnings: { increment: order.total }
      }
    });

    // Courier earnings
    if (order.courierId) {
      const earnings = orderService.calculateCourierEarnings(order.total);
      await prisma.courierProfile.update({
        where: { userId: order.courierId },
        data: {
          totalDeliveries: { increment: 1 },
          totalEarnings: { increment: earnings }
        }
      });
    }
  }
};
