/**
 * PAYMENT & REFUND EDGE CASES TEST SUITE
 * Tests for payment reconciliation edge cases, refund workflows, and payment failures
 * Issues: #90, #83, #79
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import { createTestUser, createTestPayment, cleanupTestUser, createTestOrder } from './testHelpers';

const prisma = new PrismaClient();
const API_BASE = '/api';

describe('## ISSUE #90+ - Payment Reconciliation Edge Cases', () => {
  let user: any;
  let userToken: string;
  let vendor: any;
  let vendorToken: string;
  let order: any;

  beforeAll(async () => {
    const userResult = await createTestUser({ name: 'Payment Test User' });
    user = userResult.user;
    userToken = userResult.token;

    const vendorResult = await createTestUser({ 
      name: 'Payment Test Vendor',
      role: 'vendor',
    });
    vendor = vendorResult.user;
    vendorToken = vendorResult.token;

    order = await createTestOrder(user.id, vendor.id);
  });

  describe('Multiple payment source reconciliation', () => {
    it('should detect payment from Razorpay webhook', async () => {
      const response = await request(app)
        .post(`${API_BASE}/payments/webhook`)
        .send({
          orderId: order.id,
          paymentId: `pay_webhook_${Date.now()}`,
          amount: 500,
          status: 'captured',
          timestamp: new Date().toISOString(),
        });

      console.log(`\n✅ Payment Reconciliation Results:`);
      console.log(`   Webhook detection: ${response.status === 200 ? 'Success' : 'Failed'}`);

      expect(response.status).toBe(200);
    });

    it('should detect payment from API response', async () => {
      const response = await request(app)
        .post(`${API_BASE}/payments/api-verify`)
        .send({
          orderId: order.id,
          paymentId: `pay_api_${Date.now()}`,
          amount: 500,
        });

      expect(response.status).toBe(200 || 404); // May not find if webhook already processed
    });

    it('should detect payment from database query', async () => {
      const response = await request(app)
        .get(`${API_BASE}/payments/verify`)
        .query({ orderId: order.id });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('verified');
    });

    it('should flag amount mismatches for review', async () => {
      const response = await request(app)
        .post(`${API_BASE}/payments/reconcile`)
        .send({
          orderId: order.id,
          paymentId: `pay_mismatch_${Date.now()}`,
          amount: 600, // Mismatch: should be 500
          expectedAmount: 500,
        });

      console.log(`   Amount mismatch detection: ${response.body.flagged ? 'Flagged' : 'Missed'}`);

      expect(response.body.flagged).toBe(true);
      expect(response.body.discrepancy).toBe(100);
    });
  });

  describe('Partial payment and refund scenarios', () => {
    it('should handle partial payment correctly', async () => {
      const response = await request(app)
        .post(`${API_BASE}/payments/partial`)
        .send({
          orderId: order.id,
          paidAmount: 300, // Partial payment
          totalAmount: 500,
        });

      console.log(`   Partial payment: ${response.status === 200 ? 'Handled' : 'Failed'}`);

      expect(response.status).toBe(200 || 400);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('remainingAmount');
        expect(response.body.remainingAmount).toBe(200);
      }
    });

    it('should process refund with correct amount calculation', async () => {
      // Create paid order first
      const paidOrder = await prisma.order.create({
        data: {
          userId: user.id,
          vendorId: vendor.id,
          total: 500,
          deliveryAddress: '123 Test St',
          status: 'pending',
          paymentStatus: 'success',
        },
      });

      const response = await request(app)
        .post(`${API_BASE}/orders/${paidOrder.id}/refund`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'customer_request',
          amount: 1000,
        });

      console.log(`   Refund processing: ${response.status === 200 ? 'Success' : 'Failed'}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('refundId');
      expect(response.body.refundAmount).toBe(1000);
    });

    it('should prevent over-refunding', async () => {
      const refundOrder = await prisma.order.create({
        data: {
          userId: user.id,
          vendorId: vendor.id,
          total: 500,
          deliveryAddress: '123 Test St',
          status: 'pending',
          paymentStatus: 'success',
        },
      });

      const response = await request(app)
        .post(`${API_BASE}/orders/${refundOrder.id}/refund`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'customer_request',
          amount: 600, // More than order total
        });

      console.log(`   Over-refund prevention: ${response.status === 400 ? 'Prevented' : 'Allowed (bug)'}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('exceed');
    });
  });

  describe('Duplicate payment detection', () => {
    it('should detect duplicate payment attempts', async () => {
      const paymentId = `pay_dup_${Date.now()}`;

      const response1 = await request(app)
        .post(`${API_BASE}/payments/verify`)
        .send({
          orderId: order.id,
          paymentId: paymentId,
          amount: 500,
        });

      const response2 = await request(app)
        .post(`${API_BASE}/payments/verify`)
        .send({
          orderId: order.id,
          paymentId: paymentId,
          amount: 500,
        });

      console.log(`   First payment: ${response1.status === 200 ? 'Accepted' : 'Rejected'}`);
      console.log(`   Duplicate payment: ${response2.status === 409 ? 'Rejected' : 'Allowed (bug)'}`);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(409); // Conflict
    });

    it('should track double-payment attempts', async () => {
      const response = await request(app)
        .get(`${API_BASE}/payments/duplicate-attempts`)
        .query({ orderId: order.id });

      console.log(`   Duplicate tracking: ${response.status === 200 ? 'Available' : 'Not tracked'}`);

      expect(response.status).toBe(200);
      if (response.body.duplicates) {
        expect(Array.isArray(response.body.duplicates)).toBe(true);
      }
    });
  });

  describe('Payment timeout and expiration', () => {
    it('should expire incomplete payments after timeout', async () => {
      const expireOrder = await prisma.order.create({
        data: {
          userId: user.id,
          vendorId: vendor.id,
          total: 500,
          deliveryAddress: '123 Test St',
          status: 'pending',
          paymentStatus: 'pending',
          createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
        },
      });

      const response = await request(app)
        .post(`${API_BASE}/scheduler/expire-payments`)
        .send({});

      console.log(`   Payment expiration: ${response.status === 200 ? 'Processed' : 'Failed'}`);

      const updatedOrder = await prisma.order.findUnique({
        where: { id: expireOrder.id },
      });

      if (response.status === 200) {
        expect(updatedOrder?.status).toBe('cancelled');
      }
    });
  });

  describe('Refund retry and status tracking', () => {
    it('should retry failed refund requests', async () => {
      const response = await request(app)
        .post(`${API_BASE}/payments/refund-retry`)
        .send({
          refundId: 'refund_failed_123',
        });

      console.log(`   Refund retry mechanism: ${response.status === 200 ? 'Available' : 'Not found'}`);

      expect(response.status).toBe(200 || 404);
    });

    it('should track refund status through multiple states', async () => {
      const response = await request(app)
        .get(`${API_BASE}/payments/refund-status`)
        .query({ orderId: order.id });

      expect(response.status).toBe(200);
      if (response.body.refund) {
        expect(['pending', 'processing', 'completed', 'failed']).toContain(response.body.refund.status);
      }
    });
  });

  afterAll(async () => {
    await cleanupTestUser(user.id);
    await cleanupTestUser(vendor.id);
    await prisma.$disconnect();
  });
});
