import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';  // Added Role import

const prisma = new PrismaClient();

// Augment the Express Request interface globally instead of extending it
declare global {
  namespace Express {
    interface Request {
      user: {
        id: number;
        role: Role;
      };
    }
  }
}

// Custom AuthRequest type alias for Request (leveraging global augmentation)
export type AuthRequest = Request;

// @desc    Protect routes - verifies JWT token
export const protect = async (
  req: Request,
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

    if (!token) {
      res.status(401).json({ message: 'Invalid token format' });
      return;
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      res.status(500).json({ message: 'JWT_SECRET not configured' });
      return;
    }

    const decoded = jwt.verify(token, secret) as {
      id: number;
      role: Role;
    };

    // ✅ Fetch user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      res.status(401).json({ message: 'User no longer exists' });
      return;
    }

    // ✅ ADD THIS CHECK HERE (correct place)
    if (user.isSuspended) {
      res.status(403).json({ message: "Account suspended" });
      return;
    }

    // ✅ Attach user to request
    req.user = {
      id: user.id,
      role: user.role
    };

    next();

  } catch (error) {
    res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

// @desc    Restrict access to specific roles
export const authorize = (...roles: Role[]) => {  // Changed roles parameter from string[] to Role[]
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
      return;
    }
    next();
  };
};
