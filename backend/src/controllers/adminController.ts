import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorMiddleware.js';

// ─── GET /api/admin/dashboard ─────────────────────────────────────────────────
export const getDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const [
    totalOrders,
    totalUsers,
    totalVendors,
    totalRiders,
    successfulOrders,
    cancelledOrders,
    revenueAgg,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { role: 'VENDOR' } }),
    prisma.user.count({ where: { role: 'RIDER' } }),
    prisma.order.count({ where: { status: 'DELIVERED' } }),
    prisma.order.count({ where: { status: 'CANCELLED' } }),
    prisma.payment.aggregate({
      where:  { status: 'SUCCESS' },
      _sum:   { amount: true },
    }),
    prisma.order.findMany({
      where:   { status: { in: ['PENDING', 'PREPARING', 'READY', 'PICKED_UP'] } },
      include: {
        customer: { select: { name: true } },
        vendor:   { select: { shopName: true } },
        rider:    { select: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  const gmv           = revenueAgg._sum.amount ?? 0;
  const commission     = parseFloat((gmv * 0.15).toFixed(2)); 
  const successRate    = totalOrders > 0 ? parseFloat(((successfulOrders / totalOrders) * 100).toFixed(1)) : 0;
  const cancellationRate = totalOrders > 0 ? parseFloat(((cancelledOrders / totalOrders) * 100).toFixed(1)) : 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentAllOrders = await prisma.order.findMany({
    where:   { createdAt: { gte: sevenDaysAgo } },
    select:  { createdAt: true, totalAmount: true, status: true },
  });

  const dailyTrend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const day = d.toISOString().split('T')[0];
    // Added fallback to empty string for .startsWith()
    const dayOrders = recentAllOrders.filter((o) => o.createdAt.toISOString().startsWith(day ?? ''));
    return {
      date:    day,
      orders:  dayOrders.length,
      revenue: parseFloat(
        dayOrders
          .filter((o) => o.status === 'DELIVERED')
          .reduce((s, o) => s + o.totalAmount, 0)
          .toFixed(2)
      ),
    };
  });

  res.json({
    totalOrders,
    totalUsers,
    totalVendors,
    totalRiders,
    gmv,
    commission,
    successRate,
    cancellationRate,
    activeOrders: recentOrders.length,
    dailyTrend,
    liveOrders: recentOrders,
  });
});

// ─── GET /api/admin/vendors ───────────────────────────────────────────────────
export const getAllVendors = asyncHandler(async (req: AuthRequest, res: Response) => {
  const search = req.query.search as string;

  const vendors = await prisma.vendorProfile.findMany({
    // Changed undefined to empty object for strict compatibility
    where: search ? { shopName: { contains: search, mode: 'insensitive' } } : {},
    include: {
      user:    { select: { name: true, email: true, phone: true } },
      orders:  { select: { id: true, status: true, totalAmount: true } },
      _count:  { select: { products: true } },
    },
    orderBy: { shopName: 'asc' },
  });

  const enriched = vendors.map((v) => ({
    ...v,
    totalOrders:   v.orders.length,
    totalEarnings: v.orders.filter((o) => o.status === 'DELIVERED').reduce((s, o) => s + o.totalAmount, 0),
    fulfillmentRate: v.orders.length > 0
      ? parseFloat(((v.orders.filter((o) => o.status === 'DELIVERED').length / v.orders.length) * 100).toFixed(1))
      : 0,
    orders: undefined,
  }));

  res.json(enriched);
});

// ─── PATCH /api/admin/vendors/:id/suspend ────────────────────────────────────
export const suspendVendor = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendorId = parseInt(req.params.id as string);
  if (isNaN(vendorId)) throw new AppError(400, 'Invalid vendor ID');

  const vendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new AppError(404, 'Vendor not found');

  await prisma.vendorProfile.update({
    where: { id: vendorId },
    data:  { isOpen: false },
  });

  res.json({ message: `Vendor "${vendor.shopName}" suspended` });
});

// ─── PATCH /api/admin/vendors/:id/activate ───────────────────────────────────
export const activateVendor = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendorId = parseInt(req.params.id as string);
  if (isNaN(vendorId)) throw new AppError(400, 'Invalid vendor ID');

  const vendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new AppError(404, 'Vendor not found');

  await prisma.vendorProfile.update({
    where: { id: vendorId },
    data:  { isOpen: true },
  });

  res.json({ message: `Vendor "${vendor.shopName}" activated` });
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
export const getAllUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const search = req.query.search as string;
  const role = req.query.role as string;

  const users = await prisma.user.findMany({
    where: {
      ...(role   && { role: role as any }),
      ...(search && {
        OR: [
          { name:  { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    select: {
      id: true, name: true, email: true, phone: true, role: true,
      hostel: true, roomNumber: true, createdAt: true,
      wallet:  { select: { balance: true } },
      orders:  { select: { id: true }, where: { status: 'DELIVERED' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(users.map((u) => ({ ...u, completedOrders: u.orders.length, orders: undefined })));
});

// ─── GET /api/admin/complaints ────────────────────────────────────────────────
export const getComplaints = asyncHandler(async (req: AuthRequest, res: Response) => {
  const status = req.query.status as string;

  const complaints = await prisma.complaint.findMany({
    where: status ? { status: status as any } : {},
    include: {
      user:  { select: { name: true, email: true } },
      order: { select: { id: true, totalAmount: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(complaints);
});

// ─── PATCH /api/admin/complaints/:id/resolve ─────────────────────────────────
export const resolveComplaint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const complaintId = parseInt(req.params.id as string);
  if (isNaN(complaintId)) throw new AppError(400, 'Invalid complaint ID');

  const { resolution } = req.body;
  if (!resolution) throw new AppError(400, 'Resolution text is required');

  const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
  if (!complaint) throw new AppError(404, 'Complaint not found');
  if (complaint.status === 'RESOLVED') throw new AppError(400, 'Complaint already resolved');

  const updated = await prisma.complaint.update({
    where: { id: complaintId },
    data:  { status: 'RESOLVED', resolution },
  });

  res.json({ message: 'Complaint resolved', complaint: updated });
});

// ─── GET /api/admin/live-orders ───────────────────────────────────────────────
export const getLiveOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orders = await prisma.order.findMany({
    where:   { status: { in: ['PENDING', 'PREPARING', 'READY', 'PICKED_UP'] } },
    include: {
      customer: { select: { name: true, phone: true, hostel: true, roomNumber: true } },
      vendor:   { select: { shopName: true, address: true } },
      rider:    { select: { user: { select: { name: true, phone: true } } } },
      items:    { include: { product: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json(orders);
});

// ─── PATCH /api/admin/orders/:id/cancel ──────────────────────────────────────
export const cancelOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orderId = parseInt(req.params.id as string);
  if (isNaN(orderId)) throw new AppError(400, 'Invalid order ID');

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError(404, 'Order not found');
  if (['DELIVERED', 'CANCELLED'].includes(order.status)) {
    throw new AppError(400, `Cannot cancel an order with status: ${order.status}`);
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data:  { status: 'CANCELLED' },
  });

  res.json({ message: 'Order cancelled', order: updated });
});

// ─── GET /api/admin/accounts ──────────────────────────────────────────────────
export const getAccountsReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payments = await prisma.payment.findMany({
    where:   { status: 'SUCCESS' },
    include: {
      order:  { include: { vendor: { select: { shopName: true } } } },
      user:   { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalRevenue  = payments.reduce((s, p) => s + p.amount, 0);
  const commission    = parseFloat((totalRevenue * 0.15).toFixed(2));
  const pendingPayout = parseFloat((totalRevenue * 0.85).toFixed(2));

  res.json({ totalRevenue, commission, pendingPayout, transactions: payments });
});