import express from 'express';
import {
  getDashboard,
  getAllVendors,
  suspendVendor,
  activateVendor,
  getAllUsers,
  getComplaints,
  resolveComplaint,
  getLiveOrders,
  cancelOrder,
  getAccountsReport,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { Role } from '@prisma/client';

const router = express.Router();

router.use(protect);
router.use(authorize(Role.ADMIN));

router.get('/dashboard',                   getDashboard);
router.get('/vendors',                     getAllVendors);
router.patch('/vendors/:id/suspend',       suspendVendor);
router.patch('/vendors/:id/activate',      activateVendor);
router.get('/users',                       getAllUsers);
router.get('/complaints',                  getComplaints);
router.patch('/complaints/:id/resolve',    resolveComplaint);
router.get('/live-orders',                 getLiveOrders);
router.patch('/orders/:id/cancel',         cancelOrder);
router.get('/accounts',                    getAccountsReport);

export default router;
