import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extend Express Request to carry user info
export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

// @desc    Protect routes - verifies JWT token
export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Not authorized, no token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      res.status(500).json({ message: 'JWT_SECRET not configured' });
      return;
    }

    const decoded = jwt.verify(token, secret) as { id: number; role: string };

    // Verify user still exists in DB
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      res.status(401).json({ message: 'User no longer exists' });
      return;
    }

    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

// @desc    Restrict access to specific roles
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
      return;
    }
    next();
  };
};
