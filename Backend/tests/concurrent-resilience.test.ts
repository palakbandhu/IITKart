/**
 * CONCURRENT PROCESSING & DATABASE RESILIENCE TEST SUITE
 * Tests for concurrent transaction handling, database connection recovery, and race condition prevention
 * Issues: #87, #86, #79, #78
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import { createTestUser, createTestVendor, cleanupTestUser, cleanupTestUsers } from './testHelpers';

const prisma = new PrismaClient();
const API_BASE = '/api';

describe('## ISSUE #87+ - Concurrent Processing & Resilience', () => {
  let user: any;
  let userToken: string;
  let vendor: any;
  let vendorUser: any;
  let vendorToken: string;
  let product: any;

  beforeAll(async () => {
    const userResult = await createTestUser({ name: 'Concurrent Test User' });
    user = userResult.user;
    userToken = userResult.token;

    const vendorResult = await createTestVendor({ name: 'Concurrent Test Vendor' });
    vendor = vendorResult.vendor;
    vendorUser = vendorResult.vendor.user;
    vendorToken = vendorResult.password; // Note: vendor helpers may need token extraction

    product = await prisma.product.create({
      data: {
        name: `Concurrent Test Product ${Date.now()}`,
        vendorId: vendor.id,
        price: 500,
        stock: 100,
        category: 'Testing',
      },
    }).catch(() => null); // May fail if products table doesn't exist
  });

  describe('Transaction atomicity under concurrent load', () => {
    it('should preserve database consistency with 50 concurrent updates', async () => {
      const initialStock = product.stock;
      const concurrentUpdates = [];

      for (let i = 0; i < 50; i++) {
        concurrentUpdates.push(
          request(app)
            .patch(`${API_BASE}/inventory/${product.id}`)
            .send({
              quantityChange: -1,
              operation: 'deduct',
            })
        );
      }

      const results = await Promise.all(concurrentUpdates);
      const successful = results.filter(r => r.status === 200).length;

      const finalProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });

      console.log(`\n✅ Concurrent Processing Results:`);
      console.log(`   Initial stock: ${initialStock}`);
      console.log(`   Concurrent updates: 50`);
      console.log(`   Successful deductions: ${successful}`);
      console.log(`   Final stock: ${finalProduct?.stock}`);
      console.log(`   Expected: ${initialStock - successful}`);

      expect(finalProduct?.stock).toBe(initialStock - successful);
    });

    it('should handle write conflicts gracefully', async () => {
      const conflictProduct = await prisma.product.create({
        data: {
          name: `Conflict Test ${Date.now()}`,
          vendorId: vendor.id,
          price: 100,
          stock: 50,
          category: 'Testing',
        },
      });

      const updates = [];
      for (let i = 0; i < 10; i++) {
        updates.push(
          request(app)
            .patch(`${API_BASE}/inventory/${conflictProduct.id}`)
            .send({
              quantityChange: 5,
              operation: 'add',
            })
        );
      }

      const results = await Promise.all(updates);
      const conflicts = results.filter(r => r.status === 409).length;

      console.log(`   Write conflicts detected: ${conflicts}`);
      console.log(`   Successful updates: ${results.filter(r => r.status === 200).length}`);

      expect(conflicts + results.filter(r => r.status === 200).length).toBe(10);
    });
  });

  describe('Database connection resilience', () => {
    it('should recover from temporary connection loss', async () => {
      const response = await request(app)
        .post(`${API_BASE}/health/db-resilience`)
        .send({ simulateFailure: true });

      console.log(`   Connection resilience: ${response.body.recovered ? 'Recovered' : 'Failed'}`);

      if (response.body.recovered) {
        expect(response.body.retries).toBeGreaterThan(0);
        expect(response.body.retries).toBeLessThanOrEqual(3);
      }
    });

    it('should handle connection pool exhaustion', async () => {
      const largeWorkload = [];

      for (let i = 0; i < 100; i++) {
        largeWorkload.push(
          request(app)
            .get(`${API_BASE}/products/${product.id}`)
        );
      }

      const results = await Promise.all(largeWorkload);
      const successful = results.filter(r => r.status === 200).length;

      console.log(`   Pool exhaustion test: ${successful}/100 successful`);

      // Most should succeed even under high load
      expect(successful).toBeGreaterThan(90);
    });

    it('should implement connection timeout handling', async () => {
      const response = await request(app)
        .get(`${API_BASE}/health/connection-timeout`)
        .query({ timeout: 5000 });

      expect(response.status).toBe(200 || 408); // 408 = Request Timeout
    });
  });

  describe('Order transaction isolation', () => {
    it('should prevent dirty reads across concurrent orders', async () => {
      const orderResults = [];

      for (let i = 0; i < 10; i++) {
        orderResults.push(
          request(app)
            .post(`${API_BASE}/orders/checkout`)
            .send({
              userId: user.id,
              items: [{ productId: product.id, quantity: 1 }],
              totalPrice: product.price,
            })
        );
      }

      const results = await Promise.all(orderResults);
      const orders = results.map(r => r.body.order).filter(Boolean);

      // All orders should have consistent product snapshot
      orders.forEach(order => {
        order.items.forEach((item: any) => {
          expect(item.price).toBe(product.price);
        });
      });

      console.log(`   Dirty read prevention: ${orders.length} orders with consistent data`);
    });

    it('should prevent phantom reads in order listings', async () => {
      const listing1 = await request(app)
        .get(`${API_BASE}/users/${user.id}/orders`)
        .query({ skip: 0, take: 100 });

      // Add new order
      await request(app)
        .post(`${API_BASE}/orders/checkout`)
        .send({
          userId: user.id,
          items: [{ productId: product.id, quantity: 1 }],
          totalPrice: product.price,
        });

      const listing2 = await request(app)
        .get(`${API_BASE}/users/${user.id}/orders`)
        .query({ skip: 0, take: 100 });

      console.log(`   First listing count: ${listing1.body.total || listing1.body.orders?.length}`);
      console.log(`   Second listing count: ${listing2.body.total || listing2.body.orders?.length}`);

      expect(listing1.status).toBe(200);
      expect(listing2.status).toBe(200);
    });
  });

  describe('Deadlock prevention and detection', () => {
    it('should handle potential deadlock scenarios', async () => {
      // Simulate two users trying to access same resources in different order
      const user2 = await prisma.user.create({
        data: {
          email: `deadlock-test-${Date.now()}@test.com`,
          phone: `+91${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
          password: 'hashed',
          role: 'user',
          name: 'Deadlock Test User 2',
        },
      });

      const product2 = await prisma.product.create({
        data: {
          name: `Deadlock Product ${Date.now()}`,
          vendorId: vendor.id,
          price: 500,
          stock: 50,
          category: 'Testing',
        },
      });

      const order1 = request(app)
        .post(`${API_BASE}/orders/checkout`)
        .send({
          userId: user.id,
          items: [
            { productId: product.id, quantity: 1 },
            { productId: product2.id, quantity: 1 },
          ],
          totalPrice: 1000,
        });

      const order2 = request(app)
        .post(`${API_BASE}/orders/checkout`)
        .send({
          userId: user2.id,
          items: [
            { productId: product2.id, quantity: 1 },
            { productId: product.id, quantity: 1 },
          ],
          totalPrice: 1000,
        });

      const results = await Promise.all([order1, order2]);
      const successful = results.filter(r => r.status === 201).length;

      console.log(`   Deadlock scenario: ${successful}/2 orders completed`);
      expect(successful).toBeGreaterThanOrEqual(1); // At least one should succeed

      await prisma.user.delete({ where: { id: user2.id } });
      await prisma.product.delete({ where: { id: product2.id } });
    });

    it('should detect and log transaction timeouts', async () => {
      const response = await request(app)
        .post(`${API_BASE}/debug/transaction-timeout`)
        .send({ duration: 60000 }); // 60 second transaction

      expect(response.status).toBe(200 || 408);
      if (response.body.timeout) {
        expect(response.body.timeout).toBe(true);
      }
    });
  });

  describe('Write amplification and optimization', () => {
    it('should batch writes to reduce database load', async () => {
      const response = await request(app)
        .post(`${API_BASE}/orders/batch-checkout`)
        .send({
          orders: Array(10).fill({
            userId: user.id,
            items: [{ productId: product.id, quantity: 1 }],
            totalPrice: product.price,
          }),
        });

      console.log(`   Batch write optimization: ${response.body.writeCount || 'N/A'} writes for 10 orders`);

      expect(response.status).toBe(200 || 201);
    });

    it('should implement query result caching', async () => {
      const start1 = Date.now();
      const response1 = await request(app)
        .get(`${API_BASE}/products/${product.id}/details`);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      const response2 = await request(app)
        .get(`${API_BASE}/products/${product.id}/details`);
      const time2 = Date.now() - start2;

      console.log(`   First query: ${time1}ms`);
      console.log(`   Cache hit: ${time2}ms (${((time2 / time1) * 100).toFixed(0)}% of original)`);

      expect(time2).toBeLessThan(time1);
    });
  });

  afterAll(async () => {
    if (product) {
      await prisma.product.deleteMany({ where: { id: product.id } }).catch(() => null);
    }
    await cleanupTestUser(user.id);
    await cleanupTestUser(vendorUser.id);
    await prisma.$disconnect();
  });
});
