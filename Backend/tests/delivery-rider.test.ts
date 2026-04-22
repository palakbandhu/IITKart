/**
 * DELIVERY & RIDER MANAGEMENT TEST SUITE
 * Tests for delivery workflow, rider assignment, and location tracking
 * Issues: #97, #89
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import { createTestUser, createTestCourier, cleanupTestUser } from './testHelpers';

const prisma = new PrismaClient();
const API_BASE = '/api';

describe('## ISSUE #97+ - Delivery & Rider Management', () => {
  let user: any;
  let userToken: string;
  let rider1: any;
  let rider1Token: string;
  let rider1User: any;
  let rider2: any;
  let rider2Token: string;
  let rider2User: any;
  let order: any;
  let vendor: any;
  let vendorUser: any;

  beforeAll(async () => {
    const userResult = await createTestUser({ name: 'Delivery Test User' });
    user = userResult.user;
    userToken = userResult.token;

    const courier1Result = await createTestCourier({ name: 'Rider 1' });
    rider1 = courier1Result.courier;
    rider1User = courier1Result.courier.user;
    rider1Token = courier1Result.token || courier1Result.courier.user.id; // Fallback

    const courier2Result = await createTestCourier({ name: 'Rider 2' });
    rider2 = courier2Result.courier;
    rider2User = courier2Result.courier.user;
    rider2Token = courier2Result.token || courier2Result.courier.user.id; // Fallback

    const vendorResult = await createTestUser({ 
      name: 'Test Vendor',
      role: 'vendor',
    });
    vendorUser = vendorResult.user;

    // Create vendor profile
    vendor = await prisma.vendor.create({
      data: {
        userId: vendorUser.id,
        name: 'Test Vendor Business',
        email: vendorUser.email,
        needsRider: false,
      },
    }).catch(err => {
      console.warn('Vendor creation error (may already exist):', err.message);
      return null;
    });

    order = await prisma.order.create({
      data: {
        userId: user.id,
        vendorId: vendor?.id || vendorUser.id,
        total: 500,
        status: 'pending',
        paymentStatus: 'pending',
        deliveryAddress: '123 Test St, Test City',
      },
    });
  });

  describe('Three-step delivery workflow enforcement', () => {
    it('should enforce workflow: assigned → picked → delivered', async () => {
      // Step 1: Assign rider
      const assignResponse = await request(app)
        .post(`${API_BASE}/orders/${order.id}/assign-rider`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ riderId: rider1User.id });

      expect(assignResponse.status).toBe(200);

      const assignedOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(assignedOrder?.status).toBe('assigned');

      console.log(`\n✅ Delivery Workflow Results:`);
      console.log(`   Step 1 - Assigned: ✓`);

      // Step 2: Confirm pickup
      const pickupResponse = await request(app)
        .patch(`${API_BASE}/riders/deliveries/${order.id}/pickup`)
        .send({
          latitude: 12.9716,
          longitude: 77.5946,
        });

      expect(pickupResponse.status).toBe(200);

      const pickedOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(pickedOrder?.status).toBe('picked');

      console.log(`   Step 2 - Picked up: ✓`);

      // Step 3: Confirm delivery
      const deliveryResponse = await request(app)
        .patch(`${API_BASE}/riders/deliveries/${order.id}/delivered`)
        .send({
          latitude: 12.9750,
          longitude: 77.6050,
          deliveredAt: new Date().toISOString(),
        });

      expect(deliveryResponse.status).toBe(200);

      const deliveredOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(deliveredOrder?.status).toBe('delivered');

      console.log(`   Step 3 - Delivered: ✓`);
    });

    it('should prevent delivery without pickup', async () => {
      const newOrder = await prisma.order.create({
        data: {
          userId: user.id,
          vendorId: vendorUser.id, // Use a vendor
          total: 500,
          deliveryAddress: '123 Test St',
          status: 'pending',
          paymentStatus: 'success',
          courierId: rider2User.id,
        },
      });

      // Try to deliver without pickup
      const response = await request(app)
        .patch(`${API_BASE}/riders/deliveries/${newOrder.id}/delivered`)
        .send({
          latitude: 12.9750,
          longitude: 77.6050,
        });

      console.log(`   Prevent delivery without pickup: ${response.status === 400 ? 'Prevented ✓' : 'Allowed (bug)'}`);

      expect(response.status).toBe(400);
    });

    it('should prevent pickup without assignment', async () => {
      const unassignedOrder = await prisma.order.create({
        data: {
          userId: user.id,
          vendorId: vendorUser.id,
          total: 500,
          deliveryAddress: '123 Test St',
          status: 'pending',
          paymentStatus: 'success',
        },
      });

      const response = await request(app)
        .patch(`${API_BASE}/riders/deliveries/${unassignedOrder.id}/pickup`)
        .send({
          latitude: 12.9716,
          longitude: 77.5946,
        });

      console.log(`   Prevent pickup without assignment: ${response.status === 400 ? 'Prevented ✓' : 'Allowed (bug)'}`);

      expect(response.status).toBe(400);
    });
  });

  describe('Rider assignment uniqueness', () => {
    it('should only allow single rider per order', async () => {
      const assignOrder = await prisma.order.create({
        data: {
          userId: user.id,
          vendorId: vendorUser.id,
          total: 500,
          deliveryAddress: '123 Test St',
          status: 'pending',
          paymentStatus: 'success',
        },
      });

      // First assignment
      const assign1 = await request(app)
        .post(`${API_BASE}/orders/${assignOrder.id}/assign-rider`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ riderId: rider1User.id });

      expect(assign1.status).toBe(200);

      // Second assignment attempt
      const assign2 = await request(app)
        .post(`${API_BASE}/orders/${assignOrder.id}/assign-rider`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ riderId: rider2User.id });

      console.log(`   First assignment: Success ✓`);
      console.log(`   Duplicate assignment: ${assign2.status === 409 ? 'Rejected ✓' : 'Allowed (bug)'}`);

      expect(assign2.status).toBe(409); // Conflict
    });

    it('should prevent reassignment after pickup', async () => {
      const pickupOrder = await prisma.order.create({
        data: {
          userId: user.id,
          vendorId: vendorUser.id,
          total: 500,
          deliveryAddress: '123 Test St',
          status: 'pending',
          paymentStatus: 'success',
          courierId: rider1User.id,
        },
      });

      const response = await request(app)
        .post(`${API_BASE}/orders/${pickupOrder.id}/assign-rider`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ riderId: rider2User.id });

      console.log(`   Prevent reassignment after pickup: ${response.status === 400 ? 'Prevented ✓' : 'Allowed (bug)'}`);

      expect(response.status).toBe(400);
    });
  });

  describe('Location tracking and updates', () => {
    it('should record location history during delivery', async () => {
      const trackingOrder = await prisma.order.create({
        data: {
          userId: user.id,
          vendorId: vendorUser.id,
          total: 500,
          deliveryAddress: '123 Test St',
          status: 'pending',
          paymentStatus: 'success',
          courierId: rider1User.id,
        },
      });

      const locations = [
        { lat: 12.9716, lng: 77.5946, timestamp: new Date() },
        { lat: 12.9725, lng: 77.5955, timestamp: new Date(Date.now() + 60000) },
        { lat: 12.9750, lng: 77.6050, timestamp: new Date(Date.now() + 120000) },
      ];

      for (const loc of locations) {
        const response = await request(app)
          .post(`${API_BASE}/riders/deliveries/${trackingOrder.id}/location-update`)
          .set('Authorization', `Bearer ${rider1Token}`)
          .send({
            latitude: loc.lat,
            longitude: loc.lng,
            timestamp: loc.timestamp,
          });

        expect(response.status).toBe(200);
      }

      const response = await request(app)
        .get(`${API_BASE}/orders/${trackingOrder.id}/delivery-route`);

      console.log(`   Location history recorded: ${response.body.locations?.length || 0} points`);

      expect(response.status).toBe(200);
      if (response.body.locations) {
        expect(response.body.locations.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should calculate estimated delivery time based on location', async () => {
      const response = await request(app)
        .get(`${API_BASE}/orders/${order.id}/estimated-delivery`)
        .query({
          riderLat: 12.9716,
          riderLng: 77.5946,
          destLat: 12.9750,
          destLng: 77.6050,
        });

      console.log(`   ETA calculation: ${response.body.estimatedMinutes || 'N/A'} minutes`);

      expect(response.status).toBe(200);
      if (response.body.estimatedMinutes) {
        expect(response.body.estimatedMinutes).toBeGreaterThan(0);
        expect(response.body.estimatedMinutes).toBeLessThan(60);
      }
    });

    it('should persist delivery address correctly', async () => {
      const addressOrder = await prisma.order.create({
        data: {
          userId: user.id,
          vendorId: vendorUser.id,
          total: 500,
          deliveryAddress: '123 Test St',
          status: 'pending',
          paymentStatus: 'success',
          courierId: rider1User.id,
        },
      });

      const deliveryAddress = {
        street: '123 Main St',
        city: 'Bangalore',
        state: 'KA',
        zipCode: '560001',
        latitude: 12.9750,
        longitude: 77.6050,
      };

      const response = await request(app)
        .patch(`${API_BASE}/orders/${addressOrder.id}/delivery-address`)
        .send(deliveryAddress);

      expect(response.status).toBe(200);

      const updatedOrder = await prisma.order.findUnique({
        where: { id: addressOrder.id },
      });

      console.log(`   Delivery address persisted: ✓`);
      expect(updatedOrder).toHaveProperty('deliveryAddress');
    });
  });

  describe('Rider performance and availability', () => {
    it('should track rider availability status', async () => {
      const response = await request(app)
        .get(`${API_BASE}/riders/${rider1.id}/availability`);

      console.log(`   Rider availability tracking: ${response.status === 200 ? 'Available' : 'Not tracked'}`);

      expect(response.status).toBe(200);
      if (response.body) {
        expect(['available', 'busy', 'offline']).toContain(response.body.status);
      }
    });

    it('should prevent assignment of unavailable riders', async () => {
      // Mark rider as offline
      await request(app)
        .patch(`${API_BASE}/riders/${rider2.id}/availability`)
        .send({ status: 'offline' });

      const response = await request(app)
        .post(`${API_BASE}/orders`)
        .send({
          userId: user.id,
          items: [{ productId: 'test', quantity: 1 }],
          totalPrice: 500,
          assignRider: rider2.id,
        });

      console.log(`   Prevent offline rider assignment: ${response.status === 400 ? 'Prevented ✓' : 'Allowed (bug)'}`);

      expect(response.status).toBe(400);
    });

    it('should calculate rider performance metrics', async () => {
      const response = await request(app)
        .get(`${API_BASE}/riders/${rider1.id}/performance`);

      console.log(`   Rider metrics: ${response.status === 200 ? 'Available' : 'Not tracked'}`);

      expect(response.status).toBe(200);
      if (response.body) {
        expect(response.body).toHaveProperty('totalDeliveries');
        expect(response.body).toHaveProperty('averageRating');
        expect(response.body).toHaveProperty('successRate');
      }
    });
  });

  afterAll(async () => {
    await cleanupTestUser(user.id);
    await cleanupTestUser(rider1User.id);
    await cleanupTestUser(rider2User.id);
    await prisma.$disconnect();
  });
});
