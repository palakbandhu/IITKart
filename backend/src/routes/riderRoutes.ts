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

router.use(protect);
router.use(authorize('RIDER'));

router.patch('/status',                    toggleAvailability);
router.get('/deliveries/available',        getAvailableDeliveries);
router.patch('/deliveries/:id/accept',     acceptDelivery);
router.patch('/deliveries/:id/complete',   completeDelivery);
router.get('/earnings',                    getRiderEarnings);

export default router;
