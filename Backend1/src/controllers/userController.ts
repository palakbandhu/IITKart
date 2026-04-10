import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { sanitizeUser, paginateQuery } from '../utils/helpers';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ success: true, data: sanitizeUser(req.user) });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, address } = req.body;
    let photo = req.user.photo;

    // Validate email if provided and different from current
    if (email && email !== req.user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return next(new AppError('Email already in use', 400));
    }

    // Validate phone
    if (phone) {
      const cleanPhone = String(phone).trim();
      if (!/^[0-9]{10}$/.test(cleanPhone)) {
        return next(new AppError('Phone number must contain exactly 10 digits.', 400));
      }
      
      if (cleanPhone !== req.user.phone) {
        const existingPhone = await prisma.user.findFirst({ where: { phone: cleanPhone } });
        if (existingPhone) return next(new AppError('This phone number is already registered.', 400));
      }
    }

    if (req.file) {
      photo = `/uploads/${req.file.filename}`;
    }

    const updatedData: any = { name, phone, address, photo };
    if (email) updatedData.email = email;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updatedData
    });

    res.status(200).json({ success: true, data: sanitizeUser(updatedUser) });
  } catch (error) {
    next(error);
  }
};

export const getFavorites = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ success: true, data: req.user.favorites });
  } catch (error) {
    next(error);
  }
};

export const toggleFavorite = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    let favorites = req.user.favorites || [];
    let added = false;
    
    if (favorites.includes(productId)) {
      favorites = favorites.filter((id: string) => id !== productId);
    } else {
      favorites.push(productId);
      added = true;
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { favorites }
    });

    res.status(200).json({ success: true, data: { favorites, added } });
  } catch (error) {
    next(error);
  }
};

export const getWallet = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const transactions = await prisma.order.findMany({
      where: { userId: req.user.id, kartCoinsEarned: { gt: 0 }, coinsProcessed: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, total: true, kartCoinsEarned: true, createdAt: true, vendor: { select: { name: true } } }
    });

    res.status(200).json({
      success: true,
      data: { kartCoins: req.user.kartCoins, transactions }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as any;
    const { skip, take } = paginateQuery(page, limit);

    const where = { userId: req.user.id, ...(status ? { status } : {}) };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { product: true } },
          vendor: { select: { name: true, user: { select: { phone: true } } } },
          courier: { select: { name: true, phone: true } }
        }
      }),
      prisma.order.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserComplaints = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const complaints = await prisma.complaint.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: complaints });
  } catch (error) {
    next(error);
  }
};
