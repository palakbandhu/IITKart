import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middlewares/authMiddleware';
import { orderService } from '../services/orderService';

export const placeOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { vendorId, items, deliveryAddress, paymentMethod, useKartCoins } = req.body;

    // Validate deliveryAddress
    if (!deliveryAddress || !deliveryAddress.trim()) {
      return next(new AppError('Delivery address is required', 400));
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw new AppError('User not found', 404);

    const KART_COIN_THRESHOLD = 30;
    if (useKartCoins && user.kartCoins < KART_COIN_THRESHOLD) {
      return next(new AppError('Not enough Kart Coins for free delivery', 400));
    }

    const validatedVendorId = await orderService.validateSingleVendorCart(items);
    if (validatedVendorId !== vendorId) throw new AppError('Vendor mismatch', 400);

    const productIds = items.map((i: any) => i.productId);
    const products: any[] = await prisma.product.findMany({ where: { id: { in: productIds } } });

    // Pre-Order stock validation
    for (const item of items) {
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
      // Atomic Stock Decrement
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stockQuantity: true, name: true }
        });
        
        if (!product || product.stockQuantity < item.quantity) {
          throw new AppError(`Stock sold out during checkout for ${product?.name || 'product'}`, 400);
        }

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { decrement: item.quantity },
            inStock: product.stockQuantity - item.quantity > 0
          }
        });
      }

      const newOrder = await tx.order.create({
        data: {
          userId: req.user.id,
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

      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          userId: req.user.id,
          amount: total + (useKartCoins ? 0 : 30), // 30 is delivery charge, handled by coins
          paymentStatus: 'pending',
          method: paymentMethod
        }
      });

      return newOrder;
    });

    res.status(201).json({ success: true, message: 'Order placed successfully', data: order });
  } catch (error) { next(error); }
};

export const getOrderById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { vendor: true, courier: true, items: { include: { product: true } } }
    });
    if (!order) return next(new AppError('Order not found', 404));

    // Check authorization: users can only see their own orders, admins/vendors can see all
    if (req.user.role === 'user' && order.userId !== req.user.id) {
      return next(new AppError('Unauthorized: Cannot view other user orders', 403));
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
      if (status === 'cancelled' && existingOrder.status !== 'cancelled') {
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

export const getActiveOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { in: ['pending', 'accepted', 'picked'] } },
      include: {
        vendor: { select: { name: true } },
        items: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: orders });
  } catch (error) { next(error); }
};
