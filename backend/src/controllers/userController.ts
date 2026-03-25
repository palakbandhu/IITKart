import type { Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js'; // Using the safe, global Prisma client
import { AppError, asyncHandler } from '../middleware/errorMiddleware.js';
import type { AuthRequest } from '../middleware/authMiddleware.js';

export const getUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      hostel: true,
      roomNumber: true,
      role: true,
      createdAt: true
    }
  });

  if (!user) throw new AppError(404, 'User not found');

  res.json(user);
});

export const updateUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;
  const { name, phone, hostel, roomNumber } = req.body;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { name, phone, hostel, roomNumber },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      hostel: true,
      roomNumber: true,
      role: true
    }
  });

  res.json(updatedUser);
});

export const updatePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user || !user.password) {
    throw new AppError(404, 'User not found');
  }

  const passwordMatch = await bcrypt.compare(currentPassword, user.password);

  if (!passwordMatch) {
    throw new AppError(401, 'Current password incorrect');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });

  res.json({ message: 'Password updated successfully' });
});