import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Get user's cart
export const getCart = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true }
    });

    res.json(cart);

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch cart" });
  }
};

// Add item to cart
export const addToCart = async (req: Request, res: Response) => {
  try {
    const { userId, productId, quantity } = req.body;

    let cart = await prisma.cart.findUnique({
      where: { userId }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId }
      });
    }

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId
      }
    });

    if (existingItem) {
      const updated = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity
        }
      });

      return res.json(updated);
    }

    const item = await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity
      }
    });

    res.json(item);

  } catch (error) {
    res.status(500).json({ error: "Failed to add item" });
  }
};

// Remove item
export const removeFromCart = async (req: Request, res: Response) => {
  try {
    const { userId, productId } = req.body;

    const cart = await prisma.cart.findUnique({
      where: { userId }
    });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId
      }
    });

    res.json({ message: "Item removed" });

  } catch (error) {
    res.status(500).json({ error: "Failed to remove item" });
  }
};