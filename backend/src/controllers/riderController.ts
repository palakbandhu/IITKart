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
        user: {
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
    const orderId = parseInt(req.params.id);

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

    // Concurrency-safe update: the `where` clause checks BOTH id AND riderId: null
    // If another rider already claimed it, riderId won't be null and Prisma throws P2025
    try {
      const updatedOrder = await prisma.order.update({
        where: {
          id: orderId,
          riderId: null,   // Only succeeds if still unassigned
          status: 'READY', // Only succeeds if still in READY state
        },
        data: {
          riderId: riderProfile.id,
          status: 'OUT_FOR_DELIVERY',
        },
        include: {
          items: true,
          user: {
            select: { id: true, name: true, phone: true },
          },
        },
      });

      res.status(200).json({
        message: 'Delivery accepted successfully',
        order: updatedOrder,
      });
    } catch (prismaError: any) {
      // P2025 = Record not found — means either already taken or doesn't exist
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

// @desc    Mark an assigned delivery as DELIVERED
// @route   PATCH /api/riders/deliveries/:id/complete
export const completeDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id);

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

    // Fetch the order first to do authorization check
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Authorization: rider can only complete their OWN deliveries
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

    if (order.status !== 'OUT_FOR_DELIVERY') {
      res.status(400).json({
        message: `Cannot complete order with status: ${order.status}. Order must be OUT_FOR_DELIVERY.`,
      });
      return;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'DELIVERED' },
      include: {
        items: true,
        user: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    res.status(200).json({
      message: 'Delivery completed successfully',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Complete Delivery Error:', error);
    res.status(500).json({ message: 'Server error while completing delivery', error });
  }
};
