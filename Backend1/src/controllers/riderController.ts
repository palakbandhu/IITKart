import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middlewares/authMiddleware';
import { notificationService } from '../services/notificationService';

function calculateDeliveryEarnings(orderTotal: number): number {
  return Math.floor(orderTotal * 0.15) + 20;
}

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.courierProfile.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id },
      update: {}
    });

    const reviews = await prisma.order.findMany({
      where: { courierId: req.user.id, courierRating: { not: null } },
      select: { id: true, courierRating: true, courierFeedback: true, user: { select: { name: true } }, createdAt: true }
    });

    res.status(200).json({ success: true, data: { ...profile, reviews } });
  } catch (error) { next(error); }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { experience, availability, lookingForJob } = req.body;
    const profile = await prisma.courierProfile.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id, experience, availability, lookingForJob },
      update: { experience, availability, lookingForJob }
    });
    res.status(200).json({ success: true, data: profile });
  } catch (error) { next(error); }
};

export const getPendingDeliveries = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.courierProfile.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id },
      update: {}
    });

    const orders = await prisma.order.findMany({
      where: { 
        status: { in: ['pending', 'accepted'] }, 
        courierId: null,
        id: { notIn: profile.ignoredOrders }
      },
      include: { vendor: { select: { name: true, location: true } } },
      orderBy: { createdAt: 'desc' }
    });
    
    const formatted = orders.map(o => ({
      ...o,
      estimatedEarnings: calculateDeliveryEarnings(o.total)
    }));
    
    res.status(200).json({ success: true, data: formatted });
  } catch (error) { next(error); }
};

export const acceptDelivery = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Atomic update preventing race conditions
    const updateResult = await prisma.order.updateMany({
      where: { id: req.params.orderId, status: { in: ['pending', 'accepted'] }, courierId: null },
      data: { courierId: req.user.id, status: 'picked' }
    });

    if (updateResult.count === 0) {
      return next(new AppError('Delivery is no longer available', 400));
    }

    const order = await prisma.order.findUnique({ where: { id: req.params.orderId } });
    res.status(200).json({ success: true, data: order, message: 'Delivery accepted' });
  } catch (error) { next(error); }
};

export const rejectDelivery = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.courierProfile.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id, ignoredOrders: [req.params.orderId] },
      update: { ignoredOrders: { push: req.params.orderId } }
    });
    res.status(200).json({ success: true, message: 'Delivery rejected' });
  } catch (error) { next(error); }
};

export const markDelivered = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId, courierId: req.user.id, status: 'picked' }
      });
      if (!order) throw new AppError('Invalid order state or unauthorized', 400);

      const earnings = calculateDeliveryEarnings(order.total);

      const updated = await tx.order.update({
        where: { id: order.id },
        data: { 
          status: 'delivered', 
          paymentStatus: order.paymentMethod === 'Cash on Delivery' || order.paymentMethod === 'COD' ? 'success' : order.paymentStatus,
          coinsProcessed: true
        }
      });

      if (!order.coinsProcessed) {
        await tx.user.update({
          where: { id: order.userId },
          data: { kartCoins: { increment: order.kartCoinsEarned - order.kartCoinsUsed } }
        });
      }

      await tx.courierProfile.upsert({
        where: { userId: req.user.id },
        create: { userId: req.user.id, totalDeliveries: 1, totalEarnings: earnings },
        update: { totalDeliveries: { increment: 1 }, totalEarnings: { increment: earnings } }
      });

      await tx.vendor.update({
        where: { id: order.vendorId },
        data: { totalOrders: { increment: 1 }, totalEarnings: { increment: order.total } }
      });

      return updated;
    });

    res.status(200).json({ success: true, data: result, message: 'Order delivered successfully' });
  } catch (error) { next(error); }
};

export const getActiveDeliveries = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: { courierId: req.user.id, status: 'picked' },
      include: { vendor: { select: { name: true, location: true } }, user: { select: { name: true, phone: true } } },
      orderBy: { updatedAt: 'desc' }
    });
    
    const formatted = orders.map(o => ({
      ...o,
      estimatedEarnings: calculateDeliveryEarnings(o.total)
    }));
    
    res.status(200).json({ success: true, data: formatted });
  } catch (error) { next(error); }
};

export const getDeliveryHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: { courierId: req.user.id, status: 'delivered' },
      orderBy: { updatedAt: 'desc' }
    });
    res.status(200).json({ success: true, data: orders });
  } catch (error) { next(error); }
};

export const getEarnings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.courierProfile.findUnique({ where: { userId: req.user.id } });
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = now.getDay() || 7;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);

    const completedDeliveries = await prisma.order.findMany({
      where: { courierId: req.user.id, status: 'delivered' },
      select: { id: true, vendor: { select: { location: true } }, deliveryAddress: true, total: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' }
    });
    
    let todayEarnings = 0;
    let weekEarnings = 0;

    const formattedDeliveries = completedDeliveries.map(d => {
      const e = calculateDeliveryEarnings(d.total);
      if (d.updatedAt >= startOfToday) todayEarnings += e;
      if (d.updatedAt >= startOfWeek) weekEarnings += e;
      return {
        orderId: d.id,
        from: d.vendor?.location || 'Unknown',
        to: d.deliveryAddress,
        earnings: e,
        date: d.updatedAt
      };
    });

    res.status(200).json({
      success: true,
      data: {
        totalEarnings: profile?.totalEarnings || 0,
        todayEarnings,
        weekEarnings,
        totalDeliveries: profile?.totalDeliveries || 0,
        completedDeliveries: formattedDeliveries
      }
    });
  } catch (error) { next(error); }
};

export const reportIssue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { orderId, issueType, description } = req.body;
    const issue = await prisma.deliveryIssue.create({
      data: { orderId, courierId: req.user.id, issueType, description }
    });
    res.status(201).json({ success: true, data: issue });
  } catch (error) { next(error); }
};

export const getCourierJobs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const jobs = await prisma.courierJob.findMany({
      where: { isAvailable: true },
      include: { vendor: { select: { name: true, location: true } } }
    });
    res.status(200).json({ success: true, data: jobs });
  } catch (error) { next(error); }
};

export const getFeedbacks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const feedbacks = await prisma.order.findMany({
      where: { 
        courierId: req.user.id,
        courierRating: { not: null }
      },
      select: {
        id: true,
        courierRating: true,
        courierFeedback: true,
        updatedAt: true,
        user: { select: { name: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const avgRating = feedbacks.length > 0
      ? (feedbacks.reduce((acc, curr) => acc + (curr.courierRating || 0), 0) / feedbacks.length).toFixed(1)
      : "5.0";

    res.status(200).json({ 
      success: true, 
      data: {
        feedbacks,
        avgRating
      } 
    });
  } catch (error) { next(error); }
};
