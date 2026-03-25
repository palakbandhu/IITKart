import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorMiddleware.js';

// ─── POST /api/complaints ──────────────────────────────────────────────────────
export const fileComplaint = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;
  const { subject, description, orderId } = req.body;

  if (!subject || !description) throw new AppError(400, 'Subject and description are required');

  // If orderId provided, verify it belongs to the user
  if (orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError(404, 'Order not found');
    if (order.customerId !== userId && order.riderId !== null) {
      // Allow rider to file too — verify ownership
      const riderProfile = await prisma.riderProfile.findUnique({ where: { userId } });
      if (!riderProfile || order.riderId !== riderProfile.id) {
        throw new AppError(403, 'This order is not associated with your account');
      }
    }

    // Only one complaint per order
    const existing = await prisma.complaint.findUnique({ where: { orderId } });
    if (existing) throw new AppError(409, 'A complaint for this order already exists');
  }

  const complaint = await prisma.complaint.create({
    data: { userId, subject, description, orderId: orderId ?? null },
  });

  res.status(201).json({ message: 'Complaint filed successfully', complaint });
});

// ─── GET /api/complaints/my ────────────────────────────────────────────────────
export const getMyComplaints = asyncHandler(async (req: AuthRequest, res: Response) => {
  const complaints = await prisma.complaint.findMany({
    where:   { userId: req.user.id },
    include: {
      order: { select: { id: true, status: true, totalAmount: true, vendor: { select: { shopName: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(complaints);
});

// ─── GET /api/complaints/:id ───────────────────────────────────────────────────
export const getComplaintById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) throw new AppError(400, 'Invalid complaint ID');

  const complaint = await prisma.complaint.findUnique({
    where:   { id },
    include: { order: true },
  });

  if (!complaint)                        throw new AppError(404, 'Complaint not found');
  if (complaint.userId !== req.user.id)  throw new AppError(403, 'Not your complaint');

  res.json(complaint);
});
