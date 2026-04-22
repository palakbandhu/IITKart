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
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, isDeleted: false } });
    if (products.length !== productIds.length) throw new AppError('Some products not found or are no longer available', 404);
    
    const vendorIds = new Set(products.map(p => p.vendorId));
    if (vendorIds.size > 1) throw new AppError('All products must be from the same vendor', 400);
    return [...vendorIds][0];
  },
  processOrderDelivery: async (orderId: string): Promise<void> => {
    try {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) throw new AppError('Order not found', 404);
      
      // Idempotency check: verify if earnings were already added
      const existingTx = await prisma.earningsTransaction.findUnique({
        where: { orderId: order.id }
      });

      if (!existingTx) {
        // Calculate courier earnings
        let courierEarnings = 0;
        if (order.courierId) {
          courierEarnings = orderService.calculateCourierEarnings(order.total);
        }

        // Vendor gets the remaining amount
        const vendorEarnings = order.total - courierEarnings;

        await prisma.$transaction(async (tx) => {
          // Record earning transaction
          await tx.earningsTransaction.create({
            data: {
              vendorId: order.vendorId,
              orderId: order.id,
              amount: vendorEarnings
            }
          });

          // update vendor stats
          await tx.vendor.update({
            where: { id: order.vendorId },
            data: {
              totalOrders: { increment: 1 },
              totalEarnings: { increment: vendorEarnings }
            }
          });

          // Courier earnings update
          if (order.courierId) {
            await tx.courierProfile.update({
              where: { userId: order.courierId },
              data: {
                totalDeliveries: { increment: 1 },
                totalEarnings: { increment: courierEarnings }
              }
            });
          }

          // Issue #90: Credit Kart Coins earned to user
          if (order.kartCoinsEarned > 0 && !order.coinsProcessed) {
            await tx.user.update({
              where: { id: order.userId },
              data: {
                kartCoins: { increment: order.kartCoinsEarned }
              }
            });
            await tx.order.update({
              where: { id: order.id },
              data: { coinsProcessed: true }
            });
          }
        });
      }
    } catch (error) {
      console.error('Failed to process order delivery earnings:', error);
      throw error; // Let the calling controller handle the error response
    }
  }
};
