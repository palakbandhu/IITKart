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
    const { name, phone, address } = req.body;
    let photo = req.user.photo;
    
    if (req.file) {
      photo = `/uploads/${req.file.filename}`;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, phone, address, photo }
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
      where: { userId: req.user.id, kartCoinsEarned: { gt: 0 } },
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
