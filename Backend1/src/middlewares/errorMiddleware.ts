import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';

export const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
  let error = { ...err };
  error.message = err.message;

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  // Prisma errors
  if (err.code === 'P2002') {
    const field = err.meta?.target ? (err.meta.target as string[]).join(', ') : 'field';
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists`
    });
  }
  
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Record not found'
    });
  }

  // Zod Validation Error
  if (err instanceof ZodError) {
    const errors = err.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token. Please log in again.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Your token has expired. Please log in again.' });
  }

  // Log unknown errors
  logger.error('Unhandled Exception: ', err);

  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
};
