import express from 'express';
import { toggleShopStatus, updateShopSettings, getVendorAnalytics } from '../controllers/vendorController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { Role } from '@prisma/client';

const router = express.Router();

router.use(protect);
router.use(authorize(Role.VENDOR));

router.patch('/toggle-status', toggleShopStatus);
router.put('/settings',        updateShopSettings);
router.get('/analytics',       getVendorAnalytics);

export default router;
