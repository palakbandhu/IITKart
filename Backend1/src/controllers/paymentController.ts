import { Response, NextFunction } from 'express';
import { paymentService } from '../services/paymentService';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middlewares/authMiddleware';

export const createRazorpayOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { amount, currency, orderId, items, vendorId, deliveryAddress, paymentMethod } = req.body;
    
    // If orderId is provided, validate it. Otherwise create a new order
    let dbOrder = null;
    if (orderId) {
      dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
      if (!dbOrder || dbOrder.userId !== req.user.id) {
        return next(new AppError('Invalid order', 400));
      }
    } else if (items && vendorId && deliveryAddress) {
      // Create order if items are provided
      const productIds = items.map((i: any) => i.productId);
      const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
      
      if (!products.length) {
        return next(new AppError('Products not found', 404));
      }

      let total = 0;
      const orderItemsData = items.map((item: any) => {
        const product = products.find(p => p.id === item.productId);
        if (!product) throw new AppError(`Product not found: ${item.productId}`, 404);
        total += product.price * item.quantity;
        return {
          productId: item.productId,
          quantity: item.quantity,
          price: product.price
        };
      });

      const kartCoinsEarned = Math.floor(total * 0.1);

      dbOrder = await prisma.order.create({
        data: {
          userId: req.user.id,
          vendorId,
          total,
          deliveryAddress,
          paymentMethod: paymentMethod || 'UPI',
          kartCoinsEarned,
          items: {
            create: orderItemsData
          }
        }
      });

      // Create payment record
      await prisma.payment.create({
        data: {
          orderId: dbOrder.id,
          userId: req.user.id,
          amount: total + 30,
          paymentStatus: 'pending',
          method: paymentMethod || 'UPI'
        }
      });
    } else {
      return next(new AppError('Invalid request: orderId or items required', 400));
    }

    // Security check: Use the actual computed amount (item total + flat 30 delivery)
    const finalAmount = dbOrder ? dbOrder.total + 30 : amount;

    const razorpayOrder = await paymentService.createRazorpayOrder(finalAmount, currency);
    
    res.status(200).json({
      success: true,
      data: {
        orderId: dbOrder.id,
        razorpayOrderId: razorpayOrder.id,
        amount: finalAmount,
        currency,
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) { next(error); }
};

export const verifyPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, orderId, method } = req.body;

    const isValid = paymentService.verifyRazorpaySignature(razorpayPaymentId, razorpayOrderId, razorpaySignature);
    if (!isValid) return next(new AppError('Invalid signature', 400));

    await prisma.payment.updateMany({
      where: { orderId },
      data: {
        paymentStatus: 'success',
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature,
        method
      }
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'success' }
    });

    res.status(200).json({ success: true, message: 'Payment verified' });
  } catch (error) { next(error); }
};

export const getPaymentHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: payments });
  } catch (error) { next(error); }
};

export const getReceipt = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true }
    });
    
    if (!order) return next(new AppError('Order not found', 404));

    const receipt = paymentService.generateReceipt(order);
    res.status(200).json({ success: true, data: { receipt } });
  } catch (error) { next(error); }
};
