import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorMiddleware.js';

// ─── PATCH /api/riders/status ──────────────────────────────────────────────────
export const toggleAvailability = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { isAvailable } = req.body;
  if (typeof isAvailable !== 'boolean') throw new AppError(400, '`isAvailable` must be a boolean');

  const riderProfile = await prisma.riderProfile.findUnique({ where: { userId: req.user.id } });
  if (!riderProfile) throw new AppError(404, 'Rider profile not found');

  const updated = await prisma.riderProfile.update({
    where: { userId: req.user.id },
    data: { isAvailable },
  });

  res.json({
    message: `You are now ${isAvailable ? 'available' : 'unavailable'} for deliveries`,
    riderProfile: updated,
  });
});

// ─── GET /api/riders/deliveries/available ─────────────────────────────────────
export const getAvailableDeliveries = asyncHandler(async (req: AuthRequest, res: Response) => {
  const riderProfile = await prisma.riderProfile.findUnique({ where: { userId: req.user.id } });
  if (!riderProfile) throw new AppError(404, 'Rider profile not found');
  if (!riderProfile.isAvailable) {
    throw new AppError(403, 'Toggle your status to available first.');
  }

  const availableOrders = await prisma.order.findMany({
    where: { status: 'READY', riderId: null },
    include: {
      items: { include: { product: { select: { name: true, price: true } } } },
      customer: { select: { id: true, name: true, phone: true, hostel: true, roomNumber: true } },
      vendor:   { select: { shopName: true, address: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ count: availableOrders.length, orders: availableOrders });
});

// ─── PATCH /api/riders/deliveries/:id/accept ──────────────────────────────────
export const acceptDelivery = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orderId = parseInt(req.params.id as string);
  if (isNaN(orderId)) throw new AppError(400, 'Invalid order ID');

  const riderProfile = await prisma.riderProfile.findUnique({ where: { userId: req.user.id } });
  if (!riderProfile) throw new AppError(404, 'Rider profile not found');
  if (!riderProfile.isAvailable) throw new AppError(403, 'You must be available to accept deliveries');

  try {
    const updatedOrder = await prisma.order.update({
      where: { id: orderId, riderId: null, status: 'READY' },
      data:  { riderId: riderProfile.id, status: 'PICKED_UP' },
      include: {
        items:    { include: { product: { select: { name: true } } } },
        customer: { select: { id: true, name: true, phone: true, hostel: true, roomNumber: true } },
        vendor:   { select: { shopName: true, address: true } },
      },
    });
    res.json({ message: 'Delivery accepted', order: updatedOrder });
  } catch (e: any) {
    if (e?.code === 'P2025') {
      throw new AppError(409, 'Order already accepted by another rider or not in READY state.');
    }
    throw e;
  }
});

// ─── PATCH /api/riders/deliveries/:id/complete ────────────────────────────────
export const completeDelivery = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orderId = parseInt(req.params.id as string);
  if (isNaN(orderId)) throw new AppError(400, 'Invalid order ID');

  const riderProfile = await prisma.riderProfile.findUnique({ where: { userId: req.user.id } });
  if (!riderProfile) throw new AppError(404, 'Rider profile not found');

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order)                          throw new AppError(404, 'Order not found');
  if (order.riderId !== riderProfile.id) throw new AppError(403, 'This delivery is not assigned to you');
  if (order.status === 'DELIVERED')    throw new AppError(400, 'Order already marked as delivered');
  if (order.status !== 'PICKED_UP')    throw new AppError(400, `Cannot complete an order with status: ${order.status}`);

  // Mark order delivered + increment rider stats in a transaction
  const RIDER_EARNING_PCT = 0.15; // Rider earns 15% of order total
  const earning = parseFloat((order.totalAmount * RIDER_EARNING_PCT).toFixed(2));

  const [updatedOrder] = await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data:  { status: 'DELIVERED' },
      include: {
        items:    { include: { product: { select: { name: true } } } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.riderProfile.update({
      where: { id: riderProfile.id },
      data:  {
        totalDeliveries: { increment: 1 },
        totalEarnings:   { increment: earning },
      },
    }),
  ]);

  res.json({ message: 'Delivery completed', order: updatedOrder, earning });
});

// ─── GET /api/riders/earnings ─────────────────────────────────────────────────
export const getRiderEarnings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const riderProfile = await prisma.riderProfile.findUnique({ where: { userId: req.user.id } });
  if (!riderProfile) throw new AppError(404, 'Rider profile not found');

  const deliveries = await prisma.order.findMany({
    where:   { riderId: riderProfile.id, status: 'DELIVERED' },
    include: {
      items:    { include: { product: { select: { name: true } } } },
      customer: { select: { name: true } },
      vendor:   { select: { shopName: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const RIDER_EARNING_PCT = 0.15;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deliveriesToday  = deliveries.filter((d) => new Date(d.updatedAt) >= today);
  const earningsToday    = deliveriesToday.reduce((s, d) => s + d.totalAmount * RIDER_EARNING_PCT, 0);

  res.json({
    totalDeliveries:  riderProfile.totalDeliveries,
    totalEarnings:    riderProfile.totalEarnings,
    averageRating:    riderProfile.averageRating,
    deliveriesToday:  deliveriesToday.length,
    earningsToday:    parseFloat(earningsToday.toFixed(2)),
    recentDeliveries: deliveries.slice(0, 20).map((d) => ({
      orderId:     d.id,
      vendor:      d.vendor.shopName,
      customer:    d.customer.name,
      totalAmount: d.totalAmount,
      earning:     parseFloat((d.totalAmount * RIDER_EARNING_PCT).toFixed(2)),
      deliveredAt: d.updatedAt,
    })),
  });
});
