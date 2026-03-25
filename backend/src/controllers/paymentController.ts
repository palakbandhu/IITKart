import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorMiddleware.js';

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// ─── POST /api/payments/initiate ──────────────────────────────────────────────
// Creates a Razorpay order and saves a PENDING payment record.
// For COD, marks payment as SUCCESS immediately.
export const initiatePayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;
  const { orderId, method } = req.body; // method: 'UPI' | 'CARD' | 'CASH_ON_DELIVERY' | 'KART_COINS'

  if (!orderId || !method) throw new AppError(400, 'orderId and method are required');

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order)                      throw new AppError(404, 'Order not found');
  if (order.customerId !== userId) throw new AppError(403, 'Not your order');

  const existing = await prisma.payment.findUnique({ where: { orderId } });
  if (existing?.status === 'SUCCESS') throw new AppError(400, 'Order already paid');

  // ── Cash on Delivery ──
  if (method === 'CASH_ON_DELIVERY') {
    const payment = await prisma.payment.upsert({
      where:  { orderId },
      create: { orderId, userId, amount: order.totalAmount, method: 'CASH_ON_DELIVERY', status: 'SUCCESS' },
      update: { status: 'SUCCESS', method: 'CASH_ON_DELIVERY' },
    });
    res.status(201).json({ message: 'Cash on delivery order confirmed', payment });
    return;
  }

  // ── Kart Coins ──
  if (method === 'KART_COINS') {
    const wallet = await prisma.kartWallet.findUnique({ where: { userId } });
    if (!wallet) throw new AppError(404, 'Wallet not found');

    const coinsNeeded = Math.ceil(order.totalAmount * 10); // 10 coins = ₹1
    if (wallet.balance < coinsNeeded) {
      throw new AppError(400, `Insufficient Kart Coins. You need ${coinsNeeded}, have ${wallet.balance}.`);
    }

    const [payment] = await prisma.$transaction([
      prisma.payment.upsert({
        where:  { orderId },
        create: { orderId, userId, amount: order.totalAmount, method: 'KART_COINS', status: 'SUCCESS', coinsUsed: coinsNeeded },
        update: { status: 'SUCCESS', method: 'KART_COINS', coinsUsed: coinsNeeded },
      }),
      prisma.kartWallet.update({
        where: { userId },
        data:  { balance: { decrement: coinsNeeded } },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId:    wallet.id,
          amount:      -coinsNeeded,
          description: `Payment for Order #${orderId}`,
          orderId,
        },
      }),
    ]);
    res.status(201).json({ message: 'Payment successful via Kart Coins', payment });
    return;
  }

  // ── Razorpay (UPI / Card) ──
  const rpOrder = await razorpay.orders.create({
    amount:   Math.round(order.totalAmount * 100), // paise
    currency: 'INR',
    receipt:  `rcpt_order_${orderId}`,
  });

  await prisma.payment.upsert({
    where:  { orderId },
    create: { orderId, userId, amount: order.totalAmount, method: method as any, status: 'PENDING', razorpayOrderId: rpOrder.id },
    update: { status: 'PENDING', razorpayOrderId: rpOrder.id, method: method as any },
  });

  res.status(201).json({
    razorpayOrderId: rpOrder.id,
    amount:          order.totalAmount,
    currency:        'INR',
    keyId:           process.env.RAZORPAY_KEY_ID,
  });
});

// ─── POST /api/payments/verify ────────────────────────────────────────────────
// Verifies Razorpay webhook signature, marks payment as SUCCESS.
export const verifyPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderId) {
    throw new AppError(400, 'Missing payment verification fields');
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    throw new AppError(400, 'Invalid payment signature — possible tampering detected');
  }

  const payment = await prisma.payment.update({
    where: { orderId },
    data:  {
      status:           'SUCCESS',
      razorpayPaymentId,
      razorpaySignature,
    },
  });

  // Credit Kart Coins: 10 coins per ₹100 spent (10% of order in coins)
  const COINS_PER_RUPEE = 0.1;
  const coinsEarned = Math.floor(payment.amount * COINS_PER_RUPEE);

  await prisma.$transaction(async (tx) => {
    const wallet = await tx.kartWallet.upsert({
      where:  { userId: payment.userId },
      create: { userId: payment.userId, balance: coinsEarned },
      update: { balance: { increment: coinsEarned } },
    });
    await tx.walletTransaction.create({
      data: {
        walletId:    wallet.id,
        amount:      coinsEarned,
        description: `Earned for Order #${orderId}`,
        orderId,
      },
    });
  });

  res.json({ message: 'Payment verified successfully', payment, coinsEarned });
});

// ─── GET /api/payments/transactions ───────────────────────────────────────────
export const getTransactionHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 10);

  const [transactions, total] = await Promise.all([
    prisma.payment.findMany({
      where:   { userId },
      include: {
        order: {
          include: {
            items:  { include: { product: { select: { name: true } } } },
            vendor: { select: { shopName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.payment.count({ where: { userId } }),
  ]);

  res.json({
    transactions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ─── GET /api/payments/receipt/:orderId ───────────────────────────────────────
export const getReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orderId = parseInt(req.params.orderId as string);
  if (isNaN(orderId)) throw new AppError(400, 'Invalid order ID');

  const payment = await prisma.payment.findUnique({
    where:   { orderId },
    include: {
      order: {
        include: {
          items:    { include: { product: { select: { name: true, price: true } } } },
          vendor:   { select: { shopName: true } },
          customer: { select: { name: true, email: true, hostel: true, roomNumber: true } },
        },
      },
    },
  });

  if (!payment) throw new AppError(404, 'Payment record not found');
  if (payment.userId !== req.user.id) throw new AppError(403, 'Not your receipt');

  res.json({ receipt: payment });
});
