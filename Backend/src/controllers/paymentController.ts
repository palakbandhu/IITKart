import { Response, NextFunction } from 'express';
import { paymentService } from '../services/paymentService';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middlewares/authMiddleware';
import { env } from '../config/env';

export const createRazorpayOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currency, orderId } = req.body;

    // Check if order exists and belongs to user
    const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
    if (!dbOrder) {
      return next(new AppError('Order not found', 404));
    }
    if (dbOrder.userId !== req.user.id) {
      return next(new AppError('Unauthorized: Order does not belong to user', 403));
    }

    // Securely get amount from DB
    const payment = await prisma.payment.findUnique({ where: { orderId } });
    if (!payment) {
      return next(new AppError('Payment record not found for this order', 404));
    }
    const amount = payment.amount;

    const order = await paymentService.createRazorpayOrder(amount, currency);

    res.status(200).json({
      success: true,
      data: {
        razorpayOrderId: order.id,
        amount,
        currency,
        key: env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) { next(error); }
};

export const verifyPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, orderId, method } = req.body;

    // Verify signature first
    const isValid = paymentService.verifyRazorpaySignature(razorpayPaymentId, razorpayOrderId, razorpaySignature);
    if (!isValid) return next(new AppError('Invalid payment signature', 400));

    // Check if order exists and belongs to user
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return next(new AppError('Order not found', 404));
    if (order.userId !== req.user.id) {
      return next(new AppError('Unauthorized: Order does not belong to user', 403));
    }

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
      data: { 
        paymentStatus: 'success',
        coinsProcessed: true
      }
    });

    if (!order.coinsProcessed) {
      await prisma.user.update({
        where: { id: order.userId },
        data: {
          kartCoins: {
            increment: order.kartCoinsEarned
          }
        }
      });
    }

    res.status(200).json({ success: true, message: 'Payment verified successfully' });
  } catch (error) { next(error); }
};

export const confirmCodPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.body;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return next(new AppError('Order not found', 404));
    if (order.userId !== req.user.id) return next(new AppError('Unauthorized', 403));

    await prisma.payment.updateMany({
      where: { orderId },
      data: { method: 'COD' }
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { 
        paymentMethod: 'Cash on Delivery',
        paymentStatus: 'pending'
      }
    });

    res.status(200).json({ success: true, message: 'COD payment confirmed successfully' });
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
