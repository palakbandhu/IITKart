/**
 * Test Helper Utilities
 * Provides helper functions for creating test data (users, orders, payments, etc.)
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Hash a password using bcryptjs (same as the app)
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

/**
 * Generate a JWT token for testing (mock auth)
 */
export const generateTestToken = (userId: string, email: string, role: string = 'user'): string => {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-at-least-64-chars';
  return jwt.sign(
    { id: userId, email, role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Create a test user with proper password hashing
 */
export const createTestUser = async (overrides?: {
  email?: string;
  phone?: string;
  name?: string;
  role?: 'user' | 'vendor' | 'courier' | 'admin';
  password?: string;
}) => {
  const password = overrides?.password || 'TestPass@123';
  const passwordHash = await hashPassword(password);
  
  const user = await prisma.user.create({
    data: {
      email: overrides?.email || `test-${Date.now()}@test.com`,
      phone: overrides?.phone || `+91${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
      name: overrides?.name || 'Test User',
      passwordHash,
      role: overrides?.role || 'user',
      isVerified: true,
    },
  });
  
  const token = generateTestToken(user.id, user.email, user.role);
  
  return { user, password, token }; // Return plain password and token for testing
};

/**
 * Create a test vendor
 */
export const createTestVendor = async (overrides?: {
  name?: string;
  email?: string;
  needsRider?: boolean;
}) => {
  const userPassword = 'VendorPass@123';
  const userPasswordHash = await hashPassword(userPassword);
  
  const vendor = await prisma.vendor.create({
    data: {
      user: {
        create: {
          email: overrides?.email || `vendor-${Date.now()}@test.com`,
          phone: `+91${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
          name: overrides?.name || 'Test Vendor',
          passwordHash: userPasswordHash,
          role: 'vendor',
          isVerified: true,
        },
      },
      name: overrides?.name || 'Test Vendor',
      email: overrides?.email || `vendor-${Date.now()}@test.com`,
      needsRider: overrides?.needsRider ?? false,
    },
    include: {
      user: true,
    },
  });
  
  const token = generateTestToken(vendor.user.id, vendor.user.email, 'vendor');
  
  return { vendor, password: userPassword, token };
};

/**
 * Create a test courier/rider
 */
export const createTestCourier = async (overrides?: {
  name?: string;
  email?: string;
  experience?: string;
}) => {
  const password = 'CourierPass@123';
  const passwordHash = await hashPassword(password);
  
  const courier = await prisma.courierProfile.create({
    data: {
      user: {
        create: {
          email: overrides?.email || `courier-${Date.now()}@test.com`,
          phone: `+91${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
          name: overrides?.name || 'Test Courier',
          passwordHash,
          role: 'courier',
          isVerified: true,
        },
      },
      experience: overrides?.experience || 'Experienced',
      availability: 'available',
      lookingForJob: true,
    },
    include: {
      user: true,
    },
  });
  
  const token = generateTestToken(courier.user.id, courier.user.email, 'courier');
  
  return { courier, password, token };
};

/**
 * Create a test order with all required fields
 */
export const createTestOrder = async (userId: string, vendorId: string, overrides?: {
  items?: any[];
  deliveryAddress?: string;
  paymentMethod?: string;
  total?: number;
}) => {
  const order = await prisma.order.create({
    data: {
      userId,
      vendorId,
      courierId: null,
      status: 'pending',
      total: overrides?.total || 100,
      deliveryAddress: overrides?.deliveryAddress || '123 Test Street, Test City',
      paymentMethod: overrides?.paymentMethod || 'UPI',
      paymentStatus: 'pending',
    },
  });
  
  return order;
};

/**
 * Create a test payment
 */
export const createTestPayment = async (orderId: string, amount: number, overrides?: {
  method?: 'card' | 'upi' | 'netbanking' | 'wallet' | 'cod';
  paymentStatus?: 'pending' | 'processing' | 'success' | 'failed' | 'refunded';
  razorpayPaymentId?: string;
}) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  
  const payment = await prisma.payment.create({
    data: {
      orderId,
      userId: order?.userId || '',
      amount,
      method: overrides?.method || 'upi',
      paymentStatus: overrides?.paymentStatus || 'pending',
      razorpayPaymentId: overrides?.razorpayPaymentId || `pay-${Date.now()}`,
    },
  });
  
  return payment;
};

/**
 * Clean up test data - delete a user and all related data
 */
export const cleanupTestUser = async (userId: string) => {
  try {
    // Delete related data first (order of deletion matters due to foreign keys)
    await prisma.payment.deleteMany({ where: { userId } });
    await prisma.complaint.deleteMany({ where: { userId } });
    await prisma.productReview.deleteMany({ where: { userId } });
    
    // Delete orders where user is customer
    await prisma.order.deleteMany({ where: { userId } });
    
    // Delete courier profile if exists
    await prisma.courierProfile.deleteMany({ where: { userId } });
    
    // Delete vendor profile if exists (must delete vendors first)
    await prisma.vendor.deleteMany({ where: { userId } });
    
    // Finally delete the user
    await prisma.user.delete({ where: { id: userId } });
  } catch (error) {
    console.error(`Error cleaning up test user ${userId}:`, error);
  }
};

/**
 * Clean up multiple test users
 */
export const cleanupTestUsers = async (userIds: string[]) => {
  for (const userId of userIds) {
    await cleanupTestUser(userId);
  }
};

/**
 * Helper to wait for condition with timeout
 */
export const waitForCondition = async (
  condition: () => Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<boolean> => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  return false;
};

/**
 * Helper to add auth token to supertest request
 */
export const withAuth = (req: any, token: string) => {
  if (token) {
    req.set('Authorization', `Bearer ${token}`);
  }
  return req;
};

export default {
  hashPassword,
  generateTestToken,
  createTestUser,
  createTestVendor,
  createTestCourier,
  createTestOrder,
  createTestPayment,
  cleanupTestUser,
  cleanupTestUsers,
  waitForCondition,
};
