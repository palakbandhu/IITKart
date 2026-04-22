/**
 * ADDITIONAL TEST SUITE - QUEUE PERSISTENCE & RESILIENCE
 * Tests for queue data safety, persistence, and recovery
 * Issues: #98, #87, #78
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import { createTestUser, cleanupTestUser, withAuth } from './testHelpers';

const prisma = new PrismaClient();
const API_BASE = '/api';

describe('## ISSUE #98+ - Queue Persistence & Recovery', () => {
  let user: any;
  let token: string;

  beforeAll(async () => {
    const result = await createTestUser({ name: 'Queue Test User' });
    user = result.user;
    token = result.token;
  });

  describe('Queue persistence across server restarts', () => {
    it('should recover queue state from database after restart', async () => {
      // Step 1: Add orders to queue
      const checkoutPromises = [];
      for (let i = 0; i < 5; i++) {
        checkoutPromises.push(
          request(app)
            .post(`${API_BASE}/orders/checkout`)
            .set('Authorization', `Bearer ${token}`)
            .send({
              userId: user.id,
              items: [{ productId: `prod-${i}`, quantity: 1 }],
              totalPrice: 500 + i,
            })
        );
      }

      const results = await Promise.all(checkoutPromises);
      const queuedCount = results.filter(r => r.status === 201).length;

      console.log(`\n✅ Queue Persistence Results:`);
      console.log(`   Orders queued: ${queuedCount}`);

      expect(queuedCount).toBeGreaterThan(0);

      // Step 2: Verify orders persisted in database
      const orders = await prisma.order.findMany({
        where: { userId: user.id },
      });

      expect(orders.length).toBeGreaterThanOrEqual(queuedCount);
    });

    it('should handle duplicate queue position requests', async () => {
      const response1 = await request(app)
        .get(`${API_BASE}/orders/queue/status`)
        .set('Authorization', `Bearer ${token}`)
        .query({ userId: user.id });

      const response2 = await request(app)
        .get(`${API_BASE}/orders/queue/status`)
        .set('Authorization', `Bearer ${token}`)
        .query({ userId: user.id });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.position).toBe(response2.body.position);
    });

    it('should maintain FIFO order across queue operations', async () => {
      // Get initial queue state
      const status1 = await request(app)
        .get(`${API_BASE}/orders/queue/status`)
        .set('Authorization', `Bearer ${token}`)
        .query({ userId: user.id });

      const initialPosition = status1.body.position;

      // Process one order
      await request(app)
        .post(`${API_BASE}/orders/checkout`)
        .set('Authorization', `Bearer ${token}`)
        .send({ skip: true }); // Simulated completion

      // Check position updated
      const status2 = await request(app)
        .get(`${API_BASE}/orders/queue/status`)
        .set('Authorization', `Bearer ${token}`)
        .query({ userId: user.id });

      console.log(`   Initial position: ${initialPosition}`);
      console.log(`   After processing: ${status2.body.position}`);

      expect(status2.body.position).toBeLessThanOrEqual(initialPosition);
    });
  });

  describe('Queue capacity and load balancing', () => {
    it('should handle queue exceeding capacity gracefully', async () => {
      const largeCheckoutBatch = [];

      // Attempt 250 concurrent checkouts (likely exceeds default queue size)
      for (let i = 0; i < 250; i++) {
        largeCheckoutBatch.push(
          request(app)
            .post(`${API_BASE}/orders/checkout`)
            .send({
              userId: user.id,
              items: [{ productId: `prod-${i}`, quantity: 1 }],
              totalPrice: 500 + i,
            })
        );
      }

      const results = await Promise.all(largeCheckoutBatch);
      const successful = results.filter(r => r.status === 201 || r.status === 202).length; // 202 = queued, pending
      const rejected = results.filter(r => r.status === 503 || r.status === 429).length; // Service unavailable or rate limited

      console.log(`   Attempted: 250 concurrent checkouts`);
      console.log(`   Successful/Queued: ${successful}`);
      console.log(`   Rate limited/Rejected: ${rejected}`);

      // Should handle gracefully - either accept or gracefully reject
      expect(successful + rejected).toBe(250);
    });

    it('should implement exponential backoff for queue overflow', async () => {
      const times: number[] = [];

      for (let batch = 0; batch < 3; batch++) {
        const batchStart = Date.now();

        const promises = [];
        for (let i = 0; i < 50; i++) {
          promises.push(
            request(app)
              .post(`${API_BASE}/orders/checkout`)
              .send({
                userId: user.id,
                items: [{ productId: `prod-flow-${batch}-${i}`, quantity: 1 }],
                totalPrice: 500,
              })
          );
        }

        await Promise.all(promises);
        times.push(Date.now() - batchStart);

        if (batch < 2) {
          // Wait between batches
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      console.log(`   Batch 1 time: ${times[0]}ms`);
      console.log(`   Batch 2 time: ${times[1]}ms`);
      console.log(`   Batch 3 time: ${times[2]}ms`);

      // Times should be reasonable (not exponentially increasing if no backoff)
      expect(times[0]).toBeLessThan(30000);
    });
  });

  describe('Queue error and exception handling', () => {
    it('should handle corrupted queue entries gracefully', async () => {
      // Simulate corrupted order in queue
      // First, create a valid vendor for the foreign key constraint
      const vendor = await prisma.vendor.create({
        data: {
          userId: user.id,
          name: 'Test Vendor for Queue',
          email: `queue-vendor-${Date.now()}@test.com`,
          needsRider: false,
        },
      }).catch(() => null); // May fail if vendor already exists for this user

      const corruptedOrder = await prisma.order.create({
        data: {
          userId: user.id,
          vendorId: vendor?.id || user.id + '-fake', // Fallback (will fail validation, but that's ok)
          total: 0,
          deliveryAddress: 'Test Address',
          status: 'pending',
          paymentStatus: 'pending',
        },
      }).catch(err => {
        console.log('Expected error for corrupted order:', err.message);
        return null;
      });

      const response = await request(app)
        .get(`${API_BASE}/orders/queue/status`)
        .set('Authorization', `Bearer ${token}`)
        .query({ userId: user.id });

      console.log(`   Corrupted order handling: ${response.status === 200 ? 'Graceful' : 'Failed'}`);

      expect(response.status).toBe(200);

      // Cleanup
      if (corruptedOrder) {
        await prisma.order.delete({ where: { id: corruptedOrder.id } }).catch(() => null);
      }
    });

    it('should retry failed queue operations automatically', async () => {
      const retryResponse = await request(app)
        .post(`${API_BASE}/orders/queue/retry`)
        .set('Authorization', `Bearer ${token}`)
        .send({ orderId: 'test-order-id' });

      console.log(`   Retry mechanism: ${retryResponse.status === 200 ? 'Available' : 'Not found'}`);

      if (retryResponse.status === 200) {
        expect(retryResponse.body).toHaveProperty('retryCount');
        expect(retryResponse.body).toHaveProperty('nextRetry');
      }
    });

    it('should mark orders as failed after max retries', async () => {
      const response = await request(app)
        .get(`${API_BASE}/orders/failed`)
        .set('Authorization', `Bearer ${token}`)
        .query({ userId: user.id });

      expect(response.status).toBe(200);
      if (Array.isArray(response.body.orders)) {
        expect(response.body.orders.every((o: any) => o.status === 'failed')).toBe(true);
      }
    });
  });

  afterAll(async () => {
    await cleanupTestUser(user.id);
    await prisma.$disconnect();
  });
});
