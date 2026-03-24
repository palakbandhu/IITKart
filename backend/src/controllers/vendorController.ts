import { PrismaClient } from "@prisma/client";
import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware.js";

const prisma = new PrismaClient();

export const toggleShopStatus = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Find vendor
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor profile not found" });
    }

    // 2. Toggle status
    const updatedVendor = await prisma.vendorProfile.update({
      where: { id: vendor.id },
      data: {
        isOpen: !vendor.isOpen,
      },
    });

    res.status(200).json({
      message: `Shop is now ${updatedVendor.isOpen ? "OPEN" : "CLOSED"}`,
      isOpen: updatedVendor.isOpen,
    });
  } catch (error) {
    res.status(500).json({ message: "Error toggling shop status" });
  }
};

// @desc    Update shop settings
// @route   PUT /api/vendors/settings
export const updateShopSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { shopName, shopType, description, openingTime, closingTime } = req.body;

    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!vendor) {
      res.status(404).json({ message: 'Vendor profile not found' });
      return;
    }

    const updated = await prisma.vendorProfile.update({
      where: { userId: req.user!.id },
      data: {
        ...(shopName    && { shopName }),
        ...(shopType    && { shopType }),
        ...(description !== undefined && { description }),
        ...(openingTime && { openingTime }),
        ...(closingTime && { closingTime }),
      },
    });

    res.status(200).json({ message: 'Shop settings updated successfully', vendorProfile: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error while updating shop settings', error });
  }
};

// @desc    Get vendor dashboard stats
// @route   GET /api/vendors/dashboard
export const getVendorDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!vendor) {
      res.status(404).json({ message: 'Vendor profile not found' });
      return;
    }

    const orders = await prisma.order.findMany({
      where: { vendorId: vendor.id },
    });

    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
    const totalEarnings = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalProducts = await prisma.product.count({ where: { vendorId: vendor.id } });
    const availableProducts = await prisma.product.count({ where: { vendorId: vendor.id, isAvailable: true } });

    res.status(200).json({
      message: 'Dashboard stats fetched successfully',
      stats: {
        totalOrders:      orders.length,
        deliveredOrders:  deliveredOrders.length,
        pendingOrders:    orders.filter(o => ['PENDING','PREPARING','READY'].includes(o.status)).length,
        cancelledOrders:  orders.filter(o => o.status === 'CANCELLED').length,
        totalEarnings:    parseFloat(totalEarnings.toFixed(2)),
        totalProducts,
        availableProducts,
        shopStatus:       vendor.isOpen ? 'open' : 'closed',
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching dashboard stats', error });
  }
};

// @desc    Get vendor analytics
// @route   GET /api/vendors/analytics
export const getVendorAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!vendor) {
      res.status(404).json({ message: 'Vendor profile not found' });
      return;
    }

    const deliveredOrders = await prisma.order.findMany({
      where: { vendorId: vendor.id, status: 'DELIVERED' },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Earnings by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const earningsByDay = new Map<string, number>();
    for (const order of deliveredOrders) {
      if (!order.createdAt || order.createdAt < thirtyDaysAgo) continue;
      const day = order.createdAt.toISOString().split('T')[0] ?? '';
      const current = earningsByDay.get(day) || 0;
      earningsByDay.set(day, parseFloat((current + order.totalAmount).toFixed(2)));
   }

    // Top 5 products
    const productSales: Record<number, { name: string; quantitySold: number; revenue: number }> = {};
    for (const order of deliveredOrders) {
     for (const item of order.items) {
       const existing = productSales[item.productId];
       if (!existing) {
         productSales[item.productId] = { name: item.product.name, quantitySold: item.quantity, revenue: item.price * item.quantity };
        } else {
         existing.quantitySold += item.quantity;
         existing.revenue      += item.price * item.quantity;
       }
     }
   }
    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ productId: Number(id), ...data }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5);

    // Status breakdown
    const allOrders = await prisma.order.findMany({ where: { vendorId: vendor.id } });
    const statusBreakdown = allOrders.reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      message: 'Vendor analytics fetched successfully',
      analytics: {
        earningsByDay: Object.fromEntries(earningsByDay),
        topProducts,
        statusBreakdown,
        totalRevenue: parseFloat(deliveredOrders.reduce((s, o) => s + o.totalAmount, 0).toFixed(2)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching analytics', error });
  }
};