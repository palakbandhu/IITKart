import type { Response } from 'express';
import { PrismaClient, OrderStatus } from '@prisma/client';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorMiddleware.js';

// ─── POST /api/orders ──────────────────────────────────────────────────────────
export const createOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const customerId = req.user.id;
  const { vendorId, items } = req.body;

  if (!vendorId || !items || items.length === 0) {
    throw new AppError(400, 'vendorId and at least one item are required');
  }

  const productIds = items.map((item: any) => item.productId);
  const products   = await prisma.product.findMany({ where: { id: { in: productIds } } });

  if (products.length !== items.length) throw new AppError(400, 'One or more products not found');

  let totalAmount = 0;
  const orderItems = items.map((item: any) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product)                      throw new AppError(404, `Product ${item.productId} not found`);
    if (product.vendorId !== vendorId) throw new AppError(400, 'All products must belong to the same vendor');
    if (!product.isAvailable)          throw new AppError(400, `"${product.name}" is currently unavailable`);
    if (item.quantity <= 0)            throw new AppError(400, `Quantity must be greater than 0 for "${product.name}"`);
    if (product.stock < item.quantity) throw new AppError(400, `Insufficient stock for "${product.name}"`);

    totalAmount += product.price * item.quantity;
    return { productId: product.id, quantity: item.quantity, price: product.price };
  });

  // Capture delivery address snapshot from user profile
  const customer = await prisma.user.findUnique({
    where:  { id: customerId },
    select: { hostel: true, roomNumber: true },
  });
  const deliveryAddress = [customer?.hostel, customer?.roomNumber].filter(Boolean).join(', ') || null;

  const order = await prisma.$transaction(async (tx) => {
    // Decrement stock for each product
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data:  { stock: { decrement: item.quantity } },
      });
    }

    return tx.order.create({
      data: {
        customerId,
        vendorId,
        totalAmount,
        deliveryAddress,
        items: { create: orderItems },
      },
      include: { items: { include: { product: { select: { name: true, imageUrl: true } } } } },
    });
  });

  // Clear cart after successful order
  const cart = await prisma.cart.findUnique({ where: { userId: customerId } });
  if (cart) {
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id, productId: { in: productIds } },
    });
  }

  res.status(201).json(order);
});

// ─── GET /api/orders ───────────────────────────────────────────────────────────
export const getOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;
  const role   = req.user.role;

  let orders;

  if (role === 'CUSTOMER') {
    orders = await prisma.order.findMany({
      where:   { customerId: userId },
      include: {
        items:  { include: { product: { select: { name: true, imageUrl: true, price: true } } } },
        vendor: { select: { shopName: true, imageUrl: true } },
        rider:  { select: { user: { select: { name: true, phone: true } } } },
        payment: { select: { status: true, method: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  } else if (role === 'VENDOR') {
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) throw new AppError(404, 'Vendor profile not found');

    orders = await prisma.order.findMany({
      where:   { 
        vendorId: vendor.id,
        payment: {
          OR: [
            { method: 'CASH_ON_DELIVERY' },
            { status: 'SUCCESS' }
          ]
        }
      },
      include: {
        items:    { include: { product: { select: { name: true, price: true } } } },
        customer: { select: { name: true, phone: true, hostel: true, roomNumber: true } },
        rider:    { select: { user: { select: { name: true, phone: true } } }, include: { user: { select: { name: true, phone: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  } else if (role === 'RIDER') {
    const rider = await prisma.riderProfile.findUnique({ where: { userId } });
    if (!rider) throw new AppError(404, 'Rider profile not found');

    orders = await prisma.order.findMany({
      where:   { riderId: rider.id },
      include: {
        items:    { include: { product: { select: { name: true } } } },
        customer: { select: { name: true, phone: true, hostel: true, roomNumber: true } },
        vendor:   { select: { shopName: true, address: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  res.json(orders);
});

// ─── GET /api/orders/:id ───────────────────────────────────────────────────────
export const getOrderById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orderId = Number(req.params.id);
  if (isNaN(orderId)) throw new AppError(400, 'Invalid order ID');

  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: {
      items:    { include: { product: { select: { name: true, imageUrl: true, price: true } } } },
      customer: { select: { name: true, phone: true, hostel: true, roomNumber: true } },
      vendor:   { select: { shopName: true, address: true, contactNo: true } },
      rider:    { select: { vehicleType: true, user: { select: { name: true, phone: true } } } },
      payment:  { select: { status: true, method: true, amount: true, createdAt: true } },
    },
  });

  if (!order) throw new AppError(404, 'Order not found');

  res.json(order);
});

// ─── PATCH /api/orders/:id/status ─────────────────────────────────────────────
export const updateOrderStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orderId = Number(req.params.id);
  const { status } = req.body;
  const role   = req.user.role;
  const userId = req.user.id;

  if (isNaN(orderId)) throw new AppError(400, 'Invalid order ID');
  if (!Object.values(OrderStatus).includes(status)) throw new AppError(400, 'Invalid order status');

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError(404, 'Order not found');

  if (role === 'VENDOR') {
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor || vendor.id !== order.vendorId) throw new AppError(403, 'Not your order');
    if (![OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.CANCELLED].includes(status)) {
      throw new AppError(400, 'Vendor can only set status to PREPARING, READY, or CANCELLED');
    }
  }

  if (role === 'RIDER') {
    const rider = await prisma.riderProfile.findUnique({ where: { userId } });
    if (!rider) throw new AppError(404, 'Rider profile not found');
    if (![OrderStatus.PICKED_UP, OrderStatus.DELIVERED].includes(status)) {
      throw new AppError(400, 'Rider can only set status to PICKED_UP or DELIVERED');
    }
    if (status === OrderStatus.PICKED_UP) {
      await prisma.order.update({ where: { id: orderId }, data: { riderId: rider.id } });
    }
  }

  // Restock automatically if vendor cancels an unfulfilled order
  if (status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
    const fullOrder = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (fullOrder) {
      await prisma.$transaction(
        fullOrder.items.map(item =>
          prisma.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
        )
      );
    }
  }

  const updated = await prisma.order.update({ where: { id: orderId }, data: { status } });
  res.json(updated);
});

// ─── PATCH /api/orders/:id/cancel ─────────────────────────────────────────────
// Customers can cancel their own orders while still PENDING
export const cancelOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orderId  = Number(req.params.id);
  const userId   = req.user.id;

  if (isNaN(orderId)) throw new AppError(400, 'Invalid order ID');

  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { items: true },
  });

  if (!order)                        throw new AppError(404, 'Order not found');
  if (order.customerId !== userId)   throw new AppError(403, 'Not your order');
  if (order.status !== 'PENDING')    throw new AppError(400, `Cannot cancel an order with status: ${order.status}. Only PENDING orders can be cancelled.`);

  // Restore stock and cancel in a transaction
  await prisma.$transaction([
    ...order.items.map((item) =>
      prisma.product.update({
        where: { id: item.productId },
        data:  { stock: { increment: item.quantity } },
      })
    ),
    prisma.order.update({
      where: { id: orderId },
      data:  { status: 'CANCELLED' },
    }),
  ]);

  res.json({ message: 'Order cancelled successfully' });
});
