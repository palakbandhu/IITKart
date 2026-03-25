import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../lib/prisma.js';
import { generateToken } from '../utils/helpers.js';
import { AppError, asyncHandler } from '../middleware/errorMiddleware.js';
import { logger } from '../utils/logger.js';

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS   = 3;

// ─── Utility: generate a 6-digit numeric OTP ──────────────────────────────────
function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── Utility: send OTP via Exotel (SMS) ───────────────────────────────────────
// Replace the body of this function once Exotel credentials are available.
async function sendOTP(phone: string, otp: string): Promise<void> {
  // TODO: Integrate Exotel SMS API here.
  // For local dev, OTP is logged to the console.
  logger.info(`[DEV] OTP for ${phone}: ${otp}`);

  // Example Exotel integration (uncomment when ready):
  // await axios.post(
  //   `https://api.exotel.com/v1/Accounts/${process.env.EXOTEL_SID}/Sms/send`,
  //   new URLSearchParams({
  //     From:   process.env.EXOTEL_SENDER_ID!,
  //     To:     phone,
  //     Body:   `Your IITKart OTP is ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
  //   }),
  //   { auth: { username: process.env.EXOTEL_API_KEY!, password: process.env.EXOTEL_API_TOKEN! } }
  // );
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const {
    name, email, phone, password, role,
    shopName, shopType, openingTime, closingTime,
    vehicleType, vehicleNo,
  } = req.body;

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
  });
  if (existingUser) throw new AppError(400, 'User with this email or phone already exists');

  const hashedPassword = await bcrypt.hash(password, 10);
  const userRole       = role || 'CUSTOMER';

  const user = await prisma.user.create({
    data: {
      name, email, phone, password: hashedPassword, role: userRole,
      ...(userRole === 'VENDOR' && {
        vendorProfile: { create: { shopName, shopType, openingTime, closingTime } },
      }),
      ...(userRole === 'RIDER' && {
        riderProfile: { create: { vehicleType, vehicleNo } },
      }),
    },
    include: { vendorProfile: true, riderProfile: true },
  });

  const token = generateToken(user.id, user.role);

  res.status(201).json({
    message: 'Registration successful',
    user: { id: user.id, name: user.name, email: user.email, role: user.role, vendorProfile: user.vendorProfile, riderProfile: user.riderProfile },
    token,
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(401, 'Invalid email or password');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError(401, 'Invalid email or password');

  const token = generateToken(user.id, user.role);

  res.json({
    message: 'Login successful',
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token,
  });
});

// ─── POST /api/auth/forgot-password ───────────────────────────────────────────
// Step 1: Customer provides phone/email → OTP is generated and sent via SMS
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { identifier } = req.body; // email OR phone
  if (!identifier) throw new AppError(400, 'Email or phone number is required');

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { phone: identifier }] },
  });

  // Always return 200 to prevent user enumeration
  if (!user) {
    res.json({ message: 'If an account with that identifier exists, an OTP has been sent.' });
    return;
  }

  const otp       = generateOTP();
  const otpHash   = await bcrypt.hash(otp, 10);
  const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data:  { otpHash, otpExpiry, otpAttempts: 0 },
  });

  await sendOTP(user.phone, otp);

  res.json({ message: 'OTP sent successfully. Valid for 10 minutes.', phone: user.phone.slice(-4) });
});

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────
// Step 2: Verify the OTP. Returns a short-lived reset token on success.
export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { identifier, otp } = req.body;
  if (!identifier || !otp) throw new AppError(400, 'Identifier and OTP are required');

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { phone: identifier }] },
  });
  if (!user || !user.otpHash || !user.otpExpiry) {
    throw new AppError(400, 'No pending OTP request found. Please request a new OTP.');
  }

  if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
    throw new AppError(429, 'Too many failed attempts. Please request a new OTP.');
  }

  if (new Date() > user.otpExpiry) {
    throw new AppError(400, 'OTP has expired. Please request a new one.');
  }

  const isValid = await bcrypt.compare(String(otp), user.otpHash);
  if (!isValid) {
    await prisma.user.update({
      where: { id: user.id },
      data:  { otpAttempts: { increment: 1 } },
    });
    const remaining = MAX_OTP_ATTEMPTS - (user.otpAttempts + 1);
    throw new AppError(400, `Invalid OTP. ${remaining} attempt(s) remaining.`);
  }

  // OTP verified — generate a one-time reset token (valid for 15 min)
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash   = await bcrypt.hash(resetToken, 10);
  const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data:  {
      otpHash:    resetTokenHash,
      otpExpiry:  resetTokenExpiry,
      otpAttempts: 0,
    },
  });

  res.json({ message: 'OTP verified successfully', resetToken });
});

// ─── POST /api/auth/reset-password ────────────────────────────────────────────
// Step 3: Submit new password using the reset token from step 2
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { identifier, resetToken, newPassword } = req.body;
  if (!identifier || !resetToken || !newPassword) {
    throw new AppError(400, 'identifier, resetToken, and newPassword are all required');
  }
  if (newPassword.length < 6) throw new AppError(400, 'Password must be at least 6 characters');

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { phone: identifier }] },
  });
  if (!user || !user.otpHash || !user.otpExpiry) {
    throw new AppError(400, 'Invalid or expired reset session. Please start over.');
  }
  if (new Date() > user.otpExpiry) {
    throw new AppError(400, 'Reset session expired. Please request a new OTP.');
  }

  const isValid = await bcrypt.compare(resetToken, user.otpHash);
  if (!isValid) throw new AppError(400, 'Invalid reset token.');

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data:  {
      password:   hashedPassword,
      otpHash:    null,
      otpExpiry:  null,
      otpAttempts: 0,
    },
  });

  res.json({ message: 'Password reset successfully. You can now log in.' });
});
