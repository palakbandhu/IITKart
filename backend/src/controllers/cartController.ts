import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorMiddleware.js';

// ─── GET /api/cart ─────────────────────────────────────────────────────────────
// Returns the authenticated user's cart with product + vendor info
export const getCart = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              imageUrl: true,
              isAvailable: true,
              stock: true,
              vendor: { select: { id: true, shopName: true, isOpen: true } },
            },
          },
        },
      },
    },
  });

  if (!cart) {
    res.json({ items: [], totalAmount: 0, deliveryCharge: 0 });
    return;
  }

  const totalAmount = cart.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  // Detect cross-vendor situation (warn customer, don't block)
  const vendorIds = new Set(cart.items.map((i) => i.product.vendor.id));
  const crossVendorWarning =
    vendorIds.size > 1
      ? 'Your cart contains items from multiple vendors. Please order from one vendor at a time.'
      : null;

  const DELIVERY_CHARGE = 30;

  res.json({ items: cart.items, totalAmount, deliveryCharge: DELIVERY_CHARGE, crossVendorWarning });
});

// ─── POST /api/cart/add ────────────────────────────────────────────────────────
export const addToCart = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;
  const { productId, quantity = 1 } = req.body;

  if (!productId || quantity < 1) throw new AppError(400, 'Invalid productId or quantity');

  // Verify product exists and is available
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError(404, 'Product not found');
  if (!product.isAvailable) throw new AppError(400, 'Product is not available');
  if (product.stock < quantity) throw new AppError(400, `Only ${product.stock} unit(s) in stock`);

  // Get or create cart
  let cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId } });
  }

  // Check if same product already in cart
  const existingItem = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId },
  });

  if (existingItem) {
    const updated = await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + quantity },
    });
    res.json(updated);
    return;
  }

  const item = await prisma.cartItem.create({
    data: { cartId: cart.id, productId, quantity },
  });
  res.status(201).json(item);
});

// ─── PATCH /api/cart/update ───────────────────────────────────────────────────
// Updates quantity. If quantity reaches 0, removes the item.
export const updateCartItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;
  const { productId, quantity } = req.body;

  if (!productId || quantity == null) throw new AppError(400, 'productId and quantity are required');
  if (quantity < 0) throw new AppError(400, 'Quantity cannot be negative');

  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) throw new AppError(404, 'Cart not found');

  const item = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId },
  });
  if (!item) throw new AppError(404, 'Item not in cart');

  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    res.json({ message: 'Item removed from cart' });
    return;
  }

  // Stock check
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (product && product.stock < quantity) {
    throw new AppError(400, `Only ${product.stock} unit(s) available`);
  }

  const updated = await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity },
  });
  res.json(updated);
});

// ─── DELETE /api/cart/remove ──────────────────────────────────────────────────
export const removeFromCart = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;
  const { productId } = req.body;

  if (!productId) throw new AppError(400, 'productId is required');

  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) throw new AppError(404, 'Cart not found');

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
  res.json({ message: 'Item removed' });
});

// ─── DELETE /api/cart/clear ───────────────────────────────────────────────────
export const clearCart = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;

  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) { res.json({ message: 'Cart already empty' }); return; }

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  res.json({ message: 'Cart cleared' });
});
