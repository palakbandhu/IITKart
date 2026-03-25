import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorMiddleware.js';

// ─── PATCH /api/vendors/toggle-status ─────────────────────────────────────────
export const toggleShopStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: req.user.id } });
  if (!vendor) throw new AppError(404, 'Vendor profile not found');

  const updated = await prisma.vendorProfile.update({
    where: { id: vendor.id },
    data: { isOpen: !vendor.isOpen },
  });

  res.json({
    message: `Shop is now ${updated.isOpen ? 'OPEN' : 'CLOSED'}`,
    isOpen: updated.isOpen,
  });
});

// ─── PUT /api/vendors/settings ────────────────────────────────────────────────
export const updateShopSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { shopName, shopType, openingTime, closingTime, description, address, contactNo } = req.body;

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: req.user.id } });
  if (!vendor) throw new AppError(404, 'Vendor profile not found');

  const updated = await prisma.vendorProfile.update({
    where: { id: vendor.id },
    data: {
      ...(shopName    && { shopName }),
      ...(shopType    && { shopType }),
      ...(openingTime && { openingTime }),
      ...(closingTime && { closingTime }),
      ...(description !== undefined && { description }),
      ...(address     !== undefined && { address }),
      ...(contactNo   !== undefined && { contactNo }),
    },
  });

  res.json({ message: 'Shop settings updated', vendor: updated });
});

// ─── GET /api/vendors/analytics ───────────────────────────────────────────────
// Full KPI dashboard: earnings, orders, ratings, top products, recent orders
export const getVendorAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: req.user.id } });
  if (!vendor) throw new AppError(404, 'Vendor profile not found');

  const [orders, products, reviews] = await Promise.all([
    prisma.order.findMany({
      where: { vendorId: vendor.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.findMany({
      where: { vendorId: vendor.id },
      include: { orderItems: true },
    }),
    prisma.review.findMany({
      where: { vendorId: vendor.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const totalOrders    = orders.length;
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');
  const totalEarnings  = deliveredOrders.reduce((s, o) => s + o.totalAmount, 0);
  const activeOrders   = orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status));

  // Top 5 products by units sold
  const productStats = products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    isAvailable: p.isAvailable,
    unitsSold: p.orderItems.reduce((s, oi) => s + oi.quantity, 0),
    revenue:   p.orderItems.reduce((s, oi) => s + oi.price * oi.quantity, 0),
  }));
  const topProducts = [...productStats].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5);

  // Orders by day for the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentOrders = orders.filter((o) => o.createdAt >= sevenDaysAgo);
  const dailyTrend   = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const day = d.toISOString().split('T')[0];
    return {
      date:   day,
      orders: recentOrders.filter((o) => o.createdAt.toISOString().startsWith(day || '')).length,
    };
  });

  res.json({
    totalOrders,
    totalEarnings,
    activeOrders: activeOrders.length,
    activeProducts: products.filter((p) => p.isAvailable).length,
    averageRating: vendor.averageRating,
    totalReviews:  vendor.totalReviews,
    topProducts,
    dailyTrend,
    recentReviews: reviews,
    recentActiveOrders: activeOrders.slice(0, 10),
  });
});
