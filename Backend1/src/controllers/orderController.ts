import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middlewares/authMiddleware';
import { orderService } from '../services/orderService';
import { checkoutQueue } from '../services/queueService';

/**
 * Process a single checkout operation
 * This is the actual checkout logic that gets queued
 */
const processCheckout = async (
  userId: string,
  vendorId: string,
  items: any[],
  deliveryAddress: string,
  paymentMethod: string,
  useKartCoins: boolean
): Promise<any> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  const KART_COIN_THRESHOLD = 30;
  if (useKartCoins && user.kartCoins < KART_COIN_THRESHOLD) {
    throw new AppError('Not enough Kart Coins for free delivery', 400);
  }

  const validatedVendorId = await orderService.validateSingleVendorCart(items);

  const productIds = items.map((i: any) => i.productId);
  const products: any[] = await prisma.product.findMany({ where: { id: { in: productIds } } });

  // Pre-Order stock validation
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new AppError(`Invalid quantity for product ${item.productId}`, 400);
    }
    const product = (products as any[]).find((p: any) => p.id === item.productId);
    if (!product) throw new AppError(`Product not found: ${item.productId}`, 404);
    if (Number(product.stockQuantity) < Number(item.quantity)) {
      throw new AppError(`Insufficient stock available for ${product.name}`, 400);
    }
  }

  let total = 0;
  const orderItemsData = items.map((item: any) => {
    const product = products.find(p => p.id === item.productId)!;
    total += product.price * item.quantity;
    return {
      productId: item.productId,
      quantity: item.quantity,
      price: product.price
    };
  });

  const kartCoinsEarned = orderService.calculateKartCoins(total);
  const kartCoinsUsed = useKartCoins ? KART_COIN_THRESHOLD : 0;

  const order = await prisma.$transaction(async (tx: any) => {
    const newOrder = await tx.order.create({
      data: {
        userId,
        vendorId,
        total,
        deliveryAddress: deliveryAddress.trim(),
        paymentMethod,
        kartCoinsEarned,
        kartCoinsUsed,
        items: {
          create: orderItemsData
        }
      },
      include: { items: true }
    });

    // Issue #90: Deduct Kart Coins from user balance if coins are used
    if (useKartCoins && kartCoinsUsed > 0) {
      await tx.user.update({
        where: { id: userId },
        data: {
          kartCoins: { decrement: kartCoinsUsed }
        }
      });
    }

    await tx.payment.create({
      data: {
        orderId: newOrder.id,
        userId,
        amount: total + (useKartCoins ? 0 : 30), // 30 is delivery charge, handled by coins
        paymentStatus: 'pending',
        method: paymentMethod
      }
    });

    return newOrder;
  });

  return order;
};

export const validateCart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return next(new AppError('Cart items are required', 400));
    }

    const productIds = items.map((i: any) => i.productId);
    const products: any[] = await prisma.product.findMany({ where: { id: { in: productIds }, isDeleted: false } });

    const validationResults = items.map((item: any) => {
      const product = (products as any[]).find((p: any) => p.id === item.productId);
      
      if (!product) {
        return {
          productId: item.productId,
          requestedQuantity: item.quantity,
          available: false,
          availableQuantity: 0,
          reason: 'Product not found'
        };
      }

      const availableQuantity = Number(product.stockQuantity);
      const isAvailable = availableQuantity >= item.quantity;

      return {
        productId: item.productId,
        productName: product.name,
        requestedQuantity: item.quantity,
        availableQuantity,
        available: isAvailable,
        reason: isAvailable ? null : `Only ${availableQuantity} in stock`
      };
    });

    const allAvailable = validationResults.every((r: any) => r.available);

    res.status(200).json({
      success: true,
      data: {
        allAvailable,
        items: validationResults,
        message: allAvailable ? 'All items are in stock' : 'Some items have insufficient stock'
      }
    });
  } catch (error) {
    next(error);
  }
};

export const placeOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { items, deliveryAddress, paymentMethod, useKartCoins } = req.body;

    // Validate deliveryAddress
    if (!deliveryAddress || !deliveryAddress.trim()) {
      return next(new AppError('Delivery address is required', 400));
    }

    // Instant pre-queue validation: Get authoritative vendorId and ensure items aren't deleted
    const vendorId = await orderService.validateSingleVendorCart(items);

    // Queue check - inform user if queue is backing up
    const queueStatus = checkoutQueue.getQueueStatus();
    if (queueStatus.queueLength > 0) {
      res.setHeader('X-Queue-Position', queueStatus.queueLength + 1);
      res.setHeader('X-Estimated-Wait-Ms', queueStatus.estimatedWaitTime);
    }

    // Add to queue
    const order = await checkoutQueue.enqueue({
      id: `${req.user.id}-${Date.now()}`,
      userId: req.user.id,
      vendorId,
      items,
      deliveryAddress,
      paymentMethod,
      useKartCoins,
      handler: () =>
        processCheckout(req.user.id, vendorId, items, deliveryAddress, paymentMethod, useKartCoins)
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order,
      queueInfo: queueStatus
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { vendor: true, courier: true, items: { include: { product: true } } }
    });
    if (!order) return next(new AppError('Order not found', 404));

    // Check authorization
    if (req.user.role === 'user' && order.userId !== req.user.id) {
      return next(new AppError('Unauthorized: Cannot view other user orders', 403));
    }
    
    // Vendors can only see orders for their own shop (Issue #88)
    if (req.user.role === 'vendor') {
      const vendorProfile = await prisma.vendorProfile.findUnique({ where: { userId: req.user.id } });
      if (order.vendorId !== vendorProfile?.vendorId) {
        return next(new AppError('Unauthorized: Cannot view other vendor orders', 403));
      }
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) { next(error); }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'accepted', 'picked', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return next(new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400));
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: req.params.id }
    });
    if (!existingOrder) return next(new AppError('Order not found', 404));

    // Verify vendor ownership (Issue #88)
    if (req.user.role === 'vendor') {
      const vendorProfile = await prisma.vendorProfile.findUnique({ where: { userId: req.user.id } });
      if (existingOrder.vendorId !== vendorProfile?.vendorId) {
        return next(new AppError('Unauthorized: Cannot modify other vendor orders', 403));
      }
    }

    // Verify user ownership - users can only cancel their own orders (Issue #91)
    if (req.user.role === 'user') {
      if (existingOrder.userId !== req.user.id) {
        return next(new AppError('Unauthorized: You can only modify your own orders', 403));
      }
      // Users can only cancel orders, not change to other statuses
      if (status !== 'cancelled') {
        return next(new AppError('Unauthorized: Users can only cancel orders', 403));
      }
    }

    // Idempotency check: don't process if status is already the same
    if (existingOrder.status === status) {
      return res.status(200).json({ success: true, data: existingOrder, message: 'Order status already updated' });
    }

    const order = await prisma.$transaction(async (tx: any) => {
      const updatedOrder = await tx.order.update({
        where: { id: req.params.id },
        data: { status }
      });

      // Stock Reversion if order is cancelled
      if (status === 'cancelled' && ['accepted', 'picked', 'delivered'].includes(existingOrder.status)) {
        const orderItems = await tx.orderItem.findMany({
          where: { orderId: req.params.id }
        });

        for (const item of orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: { increment: item.quantity },
              inStock: true
            }
          });
        }

        // Handle Kart Coins properly on cancellation
        const kartCoinsChange = existingOrder.kartCoinsUsed - (existingOrder.coinsProcessed ? existingOrder.kartCoinsEarned : 0);
        if (kartCoinsChange !== 0) {
          await tx.user.update({
             where: { id: existingOrder.userId },
             data: { kartCoins: { increment: kartCoinsChange } }
          });
        }
        if (existingOrder.coinsProcessed) {
          await tx.order.update({
             where: { id: existingOrder.id },
             data: { coinsProcessed: false }
          });
        }
      }

      return updatedOrder;
    });

    if (status === 'delivered') {
      await orderService.processOrderDelivery(order.id);
    }

    res.status(200).json({ success: true, data: order, message: `Order status updated to ${status}` });
  } catch (error) { next(error); }
};

export const assignCourier = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courierId } = req.body;

    // Validate courierId
    if (!courierId) {
      return next(new AppError('Courier ID is required', 400));
    }

    // Check if order exists
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return next(new AppError('Order not found', 404));

    // Verify vendor ownership (Issue #88)
    if (req.user.role === 'vendor') {
      const vendorProfile = await prisma.vendorProfile.findUnique({ where: { userId: req.user.id } });
      if (order.vendorId !== vendorProfile?.vendorId) {
        return next(new AppError('Unauthorized: Cannot assign couriers to other vendor orders', 403));
      }
    }

    // Check if courier exists
    const courier = await prisma.courierProfile.findUnique({ where: { userId: courierId } });
    if (!courier) return next(new AppError('Courier not found', 404));

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: { courierId }
    });
    res.status(200).json({ success: true, data: updatedOrder, message: 'Courier assigned successfully' });
  } catch (error) { next(error); }
};

export const rateOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existingOrder = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existingOrder) return next(new AppError('Order not found', 404));
    
    // Verify order ownership (Issue #92)
    if (existingOrder.userId !== req.user.id) {
      return next(new AppError('Unauthorized: You can only rate your own orders', 403));
    }
    
    if (existingOrder.status !== 'delivered') {
      return next(new AppError('Cannot rate an undelivered order', 400));
    }

    const { type, rating, feedback } = req.body;

    // Validate rating is between 1-5
    if (!rating || rating < 1 || rating > 5) {
      return next(new AppError('Rating must be between 1 and 5', 400));
    }

    const data: any = {};
    if (type === 'vendor') { data.vendorRating = rating; data.vendorFeedback = feedback; }
    else if (type === 'courier') { data.courierRating = rating; data.courierFeedback = feedback; }
    else if (type === 'product') { 
      data.rating = rating; 
      data.feedback = feedback; 
      
      const existingOrder = await prisma.order.findUnique({
        where: { id: req.params.id },
        include: { items: true }
      });

      if (existingOrder && !existingOrder.rating) {
        for (const item of existingOrder.items) {
          const product = await prisma.product.findUnique({ where: { id: item.productId } });
          if (product) {
            const currentTotal = product.totalReviews || 0;
            const currentRating = product.rating || 0;
            const newTotal = currentTotal + 1;
            const newRating = ((currentRating * currentTotal) + rating) / newTotal;

            await prisma.product.update({
              where: { id: product.id },
              data: {
                rating: newRating,
                totalReviews: newTotal
              }
            });
          }
        }
      }
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data
    });

    // Recalculate Vendor Rating
    if (type === 'vendor') {
      const aggregates = await prisma.order.aggregate({
        where: { vendorId: order.vendorId, vendorRating: { not: null } },
        _avg: { vendorRating: true }
      });
      
      if (aggregates._avg.vendorRating !== null) {
        await prisma.vendor.update({
          where: { id: order.vendorId },
          data: { rating: aggregates._avg.vendorRating }
        });
      }
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) { next(error); }
};

export const submitComplaint = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existingOrder = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existingOrder) return next(new AppError('Order not found', 404));
    
    // Verify order ownership (Issue #92)
    if (existingOrder.userId !== req.user.id) {
      return next(new AppError('Unauthorized: You can only file complaints on your own orders', 403));
    }
    
    if (existingOrder.status !== 'delivered') {
      return next(new AppError('Cannot submit a complaint for an undelivered order', 400));
    }

    const { subject, description, type } = req.body;

    // Validate required fields
    if (!subject || !subject.trim()) {
      return next(new AppError('Complaint subject is required', 400));
    }
    if (!description || !description.trim()) {
      return next(new AppError('Complaint description is required', 400));
    }

    const complaint = await prisma.complaint.create({
      data: {
        userId: req.user.id,
        orderId: req.params.id,
        subject: subject.trim(),
        description: description.trim(),
        type
      }
    });
    res.status(201).json({ success: true, data: complaint });
  } catch (error) { next(error); }
};

/**
 * Get checkout queue status
 * Useful for monitoring and showing users their position in queue
 */
export const getQueueStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = checkoutQueue.getQueueStatus();
    res.status(200).json({
      success: true,
      data: {
        ...status,
        message: status.queueLength > 0
          ? `${status.queueLength} orders ahead of you. Estimated wait: ${Math.ceil(status.estimatedWaitTime / 1000)}s`
          : 'No queue, you can checkout immediately'
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: { 
        status: { in: ['pending', 'accepted', 'picked'] },
        OR: [
          { paymentMethod: 'COD' },
          { paymentMethod: 'Cash on Delivery' },
          { paymentStatus: 'success' }
        ]
      },
      include: {
        vendor: { select: { name: true } },
        items: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: orders });
  } catch (error) { next(error); }
};
