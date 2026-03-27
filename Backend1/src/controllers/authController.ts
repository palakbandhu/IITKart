import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { AppError } from '../utils/AppError';
import prisma from '../config/db';
import { sanitizeUser } from '../utils/helpers';
import { Role } from '@prisma/client';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role, phone, address } = req.body;

    if (phone) {
      const cleanPhone = String(phone).trim();
      if (!/^[0-9]{10}$/.test(cleanPhone)) {
        return next(new AppError(`Phone number must contain exactly 10 digits. Received: "${cleanPhone}"`, 400));
      }
    }

    let dbRole: 'user' | 'vendor' | 'courier' | 'admin' = 'user';
    if (role === 'CUSTOMER' || role === 'user') dbRole = 'user';
    else if (role === 'VENDOR' || role === 'vendor') dbRole = 'vendor';
    else if (role === 'RIDER' || role === 'courier') dbRole = 'courier';
    else if (role === 'ADMIN' || role === 'admin') {
      return next(new AppError('Forbidden: System operates with exactly ONE master admin. Registration blocked.', 403));
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return next(new AppError('Email already registered', 400));

    const passwordHash = await authService.hashPassword(password);
    const otp = authService.generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    
    // Begin Transaction
    const user = await prisma.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
        data: { name, email, passwordHash, role: dbRole, phone, address, otp, otpExpiry, isVerified: false }
      });

      if (dbRole === 'vendor') {
        await tx.vendor.create({
          data: { userId: newUser.id, name: `${name}'s Shop`, email }
        });
      }

      if (dbRole === 'courier') {
        await tx.courierProfile.create({
          data: { userId: newUser.id }
        });
      }

      return newUser;
    });

    await notificationService.sendRegistrationOTP(user.email, otp);

    res.status(201).json({
      success: true,
      message: 'OTP sent to email. Please verify.',
      data: { userId: user.id }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.status === 'banned') {
      return next(new AppError('Invalid email or password', 401));
    }
    
    if (!user.isVerified) {
      return next(new AppError('Please verify your email to login.', 403));
    }

    if (user.role === 'vendor' || user.role === 'VENDOR' as any) {
      const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
      if (vendor && vendor.status === 'suspended') {
        return next(new AppError('Your vendor account has been suspended. Please contact the master admin.', 403));
      }
    }

    const isMatch = await authService.comparePassword(password, user.passwordHash);
    if (!isMatch) return next(new AppError('Invalid email or password', 401));

    const accessToken = authService.generateAccessToken(user.id, user.role);
    const refreshToken = authService.generateRefreshToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user: sanitizeUser(user), accessToken, refreshToken }
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier } = req.body;
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { phone: identifier }] }
    });
    
    if (!user) return next(new AppError('User not found', 404));

    const otp = authService.generateOTP();
    const token = await authService.hashOTP(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt }
    });

    await notificationService.sendOTPEmail(user.email, otp);

    const devResponse = process.env.NODE_ENV === 'development' ? { otp } : {};
    
    res.status(200).json({
      success: true,
      message: 'OTP sent',
      data: { userId: user.id, ...devResponse }
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, otp } = req.body;
    
    const tokens = await prisma.passwordResetToken.findMany({
      where: { userId, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' }
    });

    if (tokens.length === 0) return next(new AppError('Invalid or expired OTP', 400));

    let validToken = null;
    for (const t of tokens) {
      if (await authService.comparePassword(otp, t.token)) {
        validToken = t;
        break;
      }
    }

    if (!validToken) return next(new AppError('Invalid OTP', 400));

    await prisma.passwordResetToken.update({
      where: { id: validToken.id },
      data: { used: true }
    });

    res.status(200).json({
      success: true,
      data: { verified: true, resetToken: validToken.token }
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, resetToken, newPassword } = req.body;
    
    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: { userId, token: resetToken, used: true }
    });

    if (!tokenRecord) return next(new AppError('Invalid reset attempt', 400));

    const passwordHash = await authService.hashPassword(newPassword);
    
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    await prisma.passwordResetToken.deleteMany({ where: { userId } });

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

export const verifyRegistrationOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, otp } = req.body;
    
    const user = await prisma.user.findFirst({
      where: { id: userId, otp, otpExpiry: { gt: new Date() } }
    });

    if (!user) return next(new AppError('Invalid or expired OTP', 400));

    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true, otp: null, otpExpiry: null }
    });

    let returnUser = { ...user, isVerified: true };

    const accessToken = authService.generateAccessToken(returnUser.id, returnUser.role);
    const refreshToken = authService.generateRefreshToken(returnUser.id);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: { user: sanitizeUser(returnUser), accessToken, refreshToken }
    });
  } catch (error) {
    next(error);
  }
};

export const resendRegistrationOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return next(new AppError('User not found', 404));
    if (user.isVerified) return next(new AppError('User is already verified', 400));

    const otp = authService.generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: { otp, otpExpiry }
    });

    await notificationService.sendRegistrationOTP(user.email, otp);

    res.status(200).json({ success: true, message: 'OTP resent successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: any, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      success: true,
      data: sanitizeUser(req.user)
    });
  } catch (error) {
    next(error);
  }
};
