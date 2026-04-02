import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { Role } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: any;
}

export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as any;

    const currentUser = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!currentUser) {
      return next(new AppError('The user belonging to this token does no longer exist.', 401));
    }

    if (currentUser.status === 'banned') {
      return next(new AppError('Your account has been banned. Please contact admin.', 401));
    }

    req.user = currentUser;
    next();
  } catch (error) {
    next(new AppError('Invalid token or signature', 401));
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    let userRole = req.user.role.toLowerCase();
    if (userRole === 'rider') userRole = 'courier';
    if (userRole === 'customer') userRole = 'user';
    
    if (!roles.includes(userRole)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};
