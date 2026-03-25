import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorMiddleware.js';

// ─── Helper: recalculate and persist average rating ───────────────────────────

async function updateVendorRating(vendorId: number) {
  const agg = await prisma.review.aggregate({
    where:   { vendorId },
    _avg:    { rating: true },
    _count:  { rating: true },
  });
  await prisma.vendorProfile.update({
    where: { id: vendorId },
    data:  {
      averageRating: agg._avg.rating ?? 0,
      totalReviews:  agg._count.rating,
    },
  });
}

async function updateRiderRating(riderId: number) {
  const agg = await prisma.review.aggregate({
    where:   { riderId },
    _avg:    { rating: true },
    _count:  { rating: true },
  });
  await prisma.riderProfile.update({
    where: { id: riderId },
    data:  {
      averageRating: agg._avg.rating ?? 0,
      totalReviews:  agg._count.rating,
    },
  });
}

// ─── POST /api/reviews ────────────────────────────────────────────────────────
// Customer submits a review after order delivery.
// A single call can include vendor, rider, and product ratings for one order.
export const submitReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;
  const { orderId, vendorRating, riderRating, productId, productRating, comment } = req.body;

  if (!orderId) throw new AppError(400, 'orderId is required');
  if (!vendorRating && !riderRating && !productRating) {
    throw new AppError(400, 'At least one rating (vendor, rider, or product) is required');
  }

  // Verify order belongs to customer and is delivered
  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { rider: true },
  });
  if (!order)                       throw new AppError(404, 'Order not found');
  if (order.customerId !== userId)  throw new AppError(403, 'Not your order');
  if (order.status !== 'DELIVERED') throw new AppError(400, 'You can only review delivered orders');

  const created: object[] = [];

  // Vendor review
  if (vendorRating) {
    if (vendorRating < 1 || vendorRating > 5) throw new AppError(400, 'Vendor rating must be 1–5');
    const existing = await prisma.review.findFirst({ where: { orderId, vendorId: order.vendorId } });
    if (existing) throw new AppError(409, 'You already reviewed this vendor for this order');

    const review = await prisma.review.create({
      data: { userId, orderId, vendorId: order.vendorId, rating: vendorRating, comment },
    });
    await updateVendorRating(order.vendorId);
    created.push(review);
  }

  // Rider review
  if (riderRating && order.rider) {
    if (riderRating < 1 || riderRating > 5) throw new AppError(400, 'Rider rating must be 1–5');
    const existing = await prisma.review.findFirst({ where: { orderId, riderId: order.rider.id } });
    if (!existing) {
      const review = await prisma.review.create({
        data: { userId, riderId: order.rider.id, rating: riderRating },
      });
      await updateRiderRating(order.rider.id);
      created.push(review);
    }
  }

  // Product review
  if (productRating && productId) {
    if (productRating < 1 || productRating > 5) throw new AppError(400, 'Product rating must be 1–5');
    const review = await prisma.review.create({
      data: { userId, productId, rating: productRating, comment },
    });
    created.push(review);
  }

  res.status(201).json({ message: 'Review submitted successfully', reviews: created });
});

// ─── GET /api/reviews/vendor/:vendorId ────────────────────────────────────────
export const getVendorReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
  const vendorId = parseInt(req.params.vendorId as string);
  if (isNaN(vendorId)) throw new AppError(400, 'Invalid vendor ID');

  const reviews = await prisma.review.findMany({
    where:   { vendorId },
    include: { user: { select: { name: true, profileImageUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const vendor = await prisma.vendorProfile.findUnique({
    where:  { id: vendorId },
    select: { averageRating: true, totalReviews: true },
  });

  res.json({ averageRating: vendor?.averageRating ?? 0, totalReviews: vendor?.totalReviews ?? 0, reviews });
});

// ─── GET /api/reviews/rider/:riderId ──────────────────────────────────────────
export const getRiderReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
  const riderId = parseInt(req.params.riderId as string);
  if (isNaN(riderId)) throw new AppError(400, 'Invalid rider ID');

  const reviews = await prisma.review.findMany({
    where:   { riderId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const rider = await prisma.riderProfile.findUnique({
    where:  { id: riderId },
    select: { averageRating: true, totalReviews: true },
  });

  res.json({ averageRating: rider?.averageRating ?? 0, totalReviews: rider?.totalReviews ?? 0, reviews });
});
