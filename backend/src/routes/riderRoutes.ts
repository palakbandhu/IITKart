import express from 'express';
import {
  toggleAvailability,
  getAvailableDeliveries,
  acceptDelivery,
  completeDelivery,
  getRiderEarnings,
} from '../controllers/riderController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes below are protected and restricted to RIDER role only
router.use(protect);
router.use(authorize('RIDER'));

// PATCH /api/riders/status                      — Toggle availability on/off
router.patch('/status', toggleAvailability);

// GET   /api/riders/deliveries/available        — View all unassigned READY orders
router.get('/deliveries/available', getAvailableDeliveries);

// PATCH /api/riders/deliveries/:id/accept       — Accept a specific delivery
router.patch('/deliveries/:id/accept', acceptDelivery);

// PATCH /api/riders/deliveries/:id/complete     — Mark delivery as DELIVERED + credit earnings
router.patch('/deliveries/:id/complete', completeDelivery);

// GET   /api/riders/earnings                    — Earnings summary + delivery history
router.get('/earnings', getRiderEarnings);

export default router;
