import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type { AuthRequest } from '../middleware/authMiddleware.js';

const prisma = new PrismaClient();

// @desc    Toggle rider availability status
// @route   PATCH /api/riders/status
export const toggleAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      res.status(400).json({ message: '`isAvailable` must be a boolean value' });
      return;
    }

    const riderProfile = await prisma.riderProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!riderProfile) {
      res.status(404).json({ message: 'Rider profile not found' });
      return;
    }

    const updatedProfile = await prisma.riderProfile.update({
      where: { userId: req.user!.id },
      data: { isAvailable },
    });

    res.status(200).json({
      message: `You are now ${isAvailable ? 'available' : 'unavailable'} for deliveries`,
      riderProfile: updatedProfile,
    });
  } catch (error) {
    console.error('Toggle Availability Error:', error);
    res.status(500).json({ message: 'Server error while updating availability', error });
  }
};

// @desc    Get all available (unassigned, READY) deliveries
// @route   GET /api/riders/deliveries/available
export const getAvailableDeliveries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const riderProfile = await prisma.riderProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!riderProfile) {
      res.status(404).json({ message: 'Rider profile not found' });
      return;
    }

    if (!riderProfile.isAvailable) {
      res.status(403).json({
        message: 'You are currently marked as unavailable. Toggle your status to view deliveries.',
      });
      return;
    }

    const availableOrders = await prisma.order.findMany({
      where: {
        status: 'READY',
        riderId: null,
      },
      include: {
        items: true,
        customer: {
          select: { id: true, name: true, phone: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json({
      message: 'Available deliveries fetched successfully',
      count: availableOrders.length,
      orders: availableOrders,
    });
  } catch (error) {
    console.error('Get Available Deliveries Error:', error);
    res.status(500).json({ message: 'Server error while fetching deliveries', error });
  }
};

// @desc    Accept a delivery (concurrency-safe)
// @route   PATCH /api/riders/deliveries/:id/accept
export const acceptDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id as string);

    if (isNaN(orderId)) {
      res.status(400).json({ message: 'Invalid order ID' });
      return;
    }

    const riderProfile = await prisma.riderProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!riderProfile) {
      res.status(404).json({ message: 'Rider profile not found' });
      return;
    }

    if (!riderProfile.isAvailable) {
      res.status(403).json({ message: 'You must be available to accept deliveries' });
      return;
    }

    try {
      const updatedOrder = await prisma.order.update({
        where: {
          id: orderId,
          riderId: null,
          status: 'READY',
        },
        data: {
          riderId: riderProfile.id,
          status: 'PICKED_UP',
        },
        include: {
          items: true,
          customer: {
            select: { id: true, name: true, phone: true },
          },
        },
      });

      res.status(200).json({
        message: 'Delivery accepted successfully',
        order: updatedOrder,
      });
    } catch (prismaError: any) {
      if (prismaError?.code === 'P2025') {
        res.status(409).json({
          message: 'Order is no longer available. It may have been accepted by another rider or is not in READY state.',
        });
        return;
      }
      throw prismaError;
    }
  } catch (error) {
    console.error('Accept Delivery Error:', error);
    res.status(500).json({ message: 'Server error while accepting delivery', error });
  }
};

// @desc    Mark an assigned delivery as DELIVERED and credit rider earnings (10% of order)
// @route   PATCH /api/riders/deliveries/:id/complete
export const completeDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id as string);

    if (isNaN(orderId)) {
      res.status(400).json({ message: 'Invalid order ID' });
      return;
    }

    const riderProfile = await prisma.riderProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!riderProfile) {
      res.status(404).json({ message: 'Rider profile not found' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.riderId !== riderProfile.id) {
      res.status(403).json({
        message: 'Forbidden. You can only complete deliveries assigned to you.',
      });
      return;
    }

    if (order.status === 'DELIVERED') {
      res.status(400).json({ message: 'Order has already been marked as delivered' });
      return;
    }

    if (order.status !== 'PICKED_UP') {
      res.status(400).json({
        message: `Cannot complete order with status: ${order.status}. Order must be PICKED_UP.`,
      });
      return;
    }

    // Rider earns 10% of the order total
    const deliveryEarning = parseFloat((order.totalAmount * 0.10).toFixed(2));

    // Use a transaction — update order + credit earnings atomically
    const [updatedOrder, updatedRider] = await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { status: 'DELIVERED' },
        include: {
          items: true,
          customer: { select: { id: true, name: true, phone: true } },
        },
      }),
      prisma.riderProfile.update({
        where: { id: riderProfile.id },
        data: {
          totalEarnings:     { increment: deliveryEarning },
          totalDeliveries:   { increment: 1 },
        },
      }),
    ]);

    res.status(200).json({
      message: 'Delivery completed successfully',
      earning: deliveryEarning,
      order: updatedOrder,
      riderStats: {
        totalEarnings:   updatedRider.totalEarnings,
        totalDeliveries: updatedRider.totalDeliveries,
      },
    });
  } catch (error) {
    console.error('Complete Delivery Error:', error);
    res.status(500).json({ message: 'Server error while completing delivery', error });
  }
};

// @desc    Get rider earnings summary + delivery history
// @route   GET /api/riders/earnings
export const getRiderEarnings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const riderProfile = await prisma.riderProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!riderProfile) {
      res.status(404).json({ message: 'Rider profile not found' });
      return;
    }

    // Full delivery history for this rider
    const deliveries = await prisma.order.findMany({
      where: {
        riderId: riderProfile.id,
        status: 'DELIVERED',
      },
      select: {
        id:          true,
        totalAmount: true,
        createdAt:   true,
        updatedAt:   true,
        customer: {
          select: { name: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Earnings by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const earningsByDay: Record<string, number> = {};
    for (const d of deliveries) {
      if (d.updatedAt >= thirtyDaysAgo) {
        const day: string = d.updatedAt.toISOString().split('T')[0]!;
        const earned = parseFloat((d.totalAmount * 0.10).toFixed(2));
        earningsByDay[day] = parseFloat(((earningsByDay[day] || 0) + earned).toFixed(2));
      }
    }

    res.status(200).json({
      message: 'Rider earnings fetched successfully',
      summary: {
        totalEarnings:   riderProfile.totalEarnings,
        totalDeliveries: riderProfile.totalDeliveries,
      },
      earningsByDay,
      deliveryHistory: deliveries.map(d => ({
        orderId:      d.id,
        customerName: d.customer.name,
        orderAmount:  d.totalAmount,
        earned:       parseFloat((d.totalAmount * 0.10).toFixed(2)),
        deliveredAt:  d.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Get Rider Earnings Error:', error);
    res.status(500).json({ message: 'Server error while fetching earnings', error });
  }
};