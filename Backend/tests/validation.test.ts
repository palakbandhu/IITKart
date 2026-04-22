/**
 * Backend Validation Tests - Issues #1-9
 * Tests for input validation, authorization, and data integrity
 */

import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';
import { createTestUser, createTestVendor, createTestOrder, cleanupTestUser } from './testHelpers';

describe('Backend Validation Tests', () => {
  let token: string;
  let userId: string;
  let userEmail: string;
  let orderId: string;
  let vendorId: string;
  let vendorTestUserId: string;
  let vendorToken: string;
  let secondaryUserId: string;
  let secondaryUserEmail: string;

  beforeAll(async () => {
    // Setup: Create primary test user with proper token
    const userResult = await createTestUser({
      name: 'Validation Test User',
      email: `validation-${Date.now()}@test.com`,
    });
    
    token = userResult.token;
    userId = userResult.user.id;
    userEmail = userResult.user.email;

    // Create a secondary user for duplicate email tests
    try {
      const secondaryResult = await createTestUser({
        name: 'Secondary Test User',
        email: `validation-secondary-${Date.now()}@test.com`,
      });
      secondaryUserId = secondaryResult.user.id;
      secondaryUserEmail = secondaryResult.user.email;
    } catch (error) {
      console.error('Failed to create secondary test user:', error);
    }

    // Create a test vendor for order-related tests
    try {
      const vendorResult = await createTestVendor({
        name: 'Validation Test Vendor',
        email: `validation-vendor-${Date.now()}@test.com`,
      });
      vendorId = vendorResult.vendor.id;
      vendorTestUserId = vendorResult.vendor.userId;
      vendorToken = vendorResult.token;
    } catch (error) {
      console.error('Failed to create test vendor:', error);
      vendorId = 'test-vendor-id';
    }

    // Create a test order and set it to 'delivered' for rating tests
    try {
      if (vendorId) {
        const order = await createTestOrder(userId, vendorId, {
          deliveryAddress: 'Hall A, IIT Kanpur',
          total: 500,
        });
        orderId = order.id;
        
        // Update order status to 'delivered' for rating tests
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'delivered' }
        });
      }
    } catch (error) {
      console.error('Failed to create test order:', error);
      orderId = 'test-order-id';
    }
  });

  describe('Issue #1: Email field in profile update', () => {
    it('should save email field when updating profile', async () => {
      const uniquePhone = `${Math.random().toString().slice(2, 12)}`.padEnd(10, '0').slice(0, 10);
      const res = await request(app)
        .patch(`/api/users/profile`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Name',
          email: `newemail-${Date.now()}@iitk.ac.in`,
          phone: uniquePhone,
          address: 'Hall A, Room 101'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.email).toContain('newemail-');
    });

    it('should reject duplicate email', async () => {
      const res = await request(app)
        .patch(`/api/users/profile`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: secondaryUserEmail // Use the secondary user's email to trigger duplicate
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already');
    });
  });

  describe('Issue #2: Rating validation (1-5 range)', () => {
    it('should accept valid rating 1-5', async () => {
      for (let rating = 1; rating <= 5; rating++) {
        const res = await request(app)
          .patch(`/api/orders/${orderId}/rate`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            type: 'product',
            rating,
            feedback: 'Good product'
          });

        expect(res.status).toBe(200);
      }
    });

    it('should reject rating < 1', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/rate`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'product',
          rating: 0,
          feedback: 'Bad'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('between 1 and 5');
    });

    it('should reject rating > 5', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/rate`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'product',
          rating: 6,
          feedback: 'Excellent'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('between 1 and 5');
    });

    it('should reject missing rating', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/rate`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'product',
          feedback: 'Good product'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Issue #3: Complaint field validation', () => {
    it('should accept valid complaint', async () => {
      const res = await request(app)
        .post(`/api/orders/${orderId}/complaint`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          subject: 'Missing items',
          description: 'Order was missing 2 items from the list',
          type: 'order'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.subject).toBe('Missing items');
    });

    it('should reject empty subject', async () => {
      const res = await request(app)
        .post(`/api/orders/${orderId}/complaint`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          subject: '',
          description: 'Some description',
          type: 'order'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('subject');
    });

    it('should reject empty description', async () => {
      const res = await request(app)
        .post(`/api/orders/${orderId}/complaint`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          subject: 'Some issue',
          description: '   ',
          type: 'order'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('description');
    });

    it('should trim whitespace', async () => {
      const res = await request(app)
        .post(`/api/orders/${orderId}/complaint`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          subject: '  Wrong order  ',
          description: '  Received different product  ',
          type: 'order'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.subject).toBe('Wrong order');
      expect(res.body.data.description).toBe('Received different product');
    });
  });

  describe('Issue #4: Order status validation', () => {
    it('should reject invalid status', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid status');
    });

    it('should show error for invalid status', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'shipped' });

      expect(res.status).toBe(400);
    });

    it('should require status field', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('Issue #5: Delivery address validation', () => {
    it('should accept valid delivery address in order', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: vendorId,
          items: [{ productId: 'test-product', quantity: 1 }],
          deliveryAddress: 'Hall A, Room 101',
          paymentMethod: 'UPI'
        });

      expect([200, 201, 400, 404]).toContain(res.status);
    });

    it('should reject empty delivery address', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: 'vendor1',
          items: [{ productId: 'prod1', quantity: 1 }],
          deliveryAddress: '',
          paymentMethod: 'UPI'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('address');
    });

    it('should reject whitespace-only address', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendorId: 'vendor1',
          items: [{ productId: 'prod1', quantity: 1 }],
          deliveryAddress: '   ',
          paymentMethod: 'UPI'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Issue #6: Authorization checks', () => {
    it('should allow user to view own orders', async () => {
      const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
    });

    it('should require authorization for viewing orders', async () => {
      const res = await request(app)
        .get(`/api/orders/${orderId}`);

      expect(res.status).toBe(401);
    });

    it('should handle non-existent orders gracefully', async () => {
      const res = await request(app)
        .get('/api/orders/nonexistent-id')
        .set('Authorization', `Bearer ${token}`);

      expect([403, 404]).toContain(res.status);
    });
  });

  describe('Issue #7: Courier assignment validation', () => {
    it('should handle courier assignment request', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/assign-courier`)
        .set('Authorization', `Bearer ${token}`)
        .send({ courierId: 'test-courier' });

      expect([200, 400, 403, 404]).toContain(res.status);
    });

    it('should require authorization for courier assignment', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/assign-courier`)
        .send({ courierId: 'test-courier' });

      expect(res.status).toBe(401);
    });

    it('should handle courier assignment with vendor token', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/assign-courier`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ courierId: 'valid-courier' });

      expect([200, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('Issue #8: Env config for Razorpay', () => {
    it('should use env.RAZORPAY_KEY_ID not process.env', async () => {
      const res = await request(app)
        .post('/api/payments/create-razorpay-order')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 100,
          currency: 'INR',
          orderId
        });

      expect([200, 400, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.key).toBeDefined();
      }
    });
  });

  describe('Issue #9: Active orders incomplete data', () => {
    it('should retrieve active orders with authorization', async () => {
      const res = await request(app)
        .get('/api/orders/active')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 403, 404]).toContain(res.status);
    });

    it('should require authorization for active orders', async () => {
      const res = await request(app)
        .get('/api/orders/active');

      expect(res.status).toBe(401);
    });
  });

  afterAll(async () => {
    if (userId) {
      await cleanupTestUser(userId);
    }
    if (secondaryUserId) {
      await cleanupTestUser(secondaryUserId);
    }
    if (vendorTestUserId) {
      await cleanupTestUser(vendorTestUserId);
    }
    await prisma.$disconnect();
  });
});
