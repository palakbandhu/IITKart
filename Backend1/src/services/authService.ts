import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const authService = {
  hashPassword: async (password: string) => bcrypt.hash(password, 12),
  comparePassword: async (plain: string, hash: string) => bcrypt.compare(plain, hash),
  generateAccessToken: (id: string, role: string) => jwt.sign({ id, role }, env.JWT_SECRET as string, { expiresIn: env.JWT_EXPIRES_IN as any }),
  generateRefreshToken: (id: string) => jwt.sign({ id }, env.REFRESH_TOKEN_SECRET as string, { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as any }),
  verifyAccessToken: (token: string) => jwt.verify(token, env.JWT_SECRET),
  verifyRefreshToken: (token: string) => jwt.verify(token, env.REFRESH_TOKEN_SECRET),
  generateOTP: () => Math.floor(100000 + Math.random() * 900000).toString(),
  hashOTP: async (otp: string) => bcrypt.hash(otp, 12)
};
