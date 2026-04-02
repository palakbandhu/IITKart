import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { verifyToken, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Secure all admin routes
router.use(verifyToken);
router.use(requireRole('admin'));

// Platform Analytics
router.get('/stats', adminController.getPlatformStats);

// Entity Management
router.get('/users', adminController.listUsers);
router.patch('/users/:id/ban', adminController.banUser);

router.get('/vendors', adminController.listVendors);
router.patch('/vendors/:id/status', adminController.toggleVendorStatus);

// Order & Issue Overrides
router.get('/orders', adminController.getOrders);
router.patch('/orders/:id/status', adminController.forceUpdateOrderStatus);

router.get('/complaints', adminController.getComplaints);
router.patch('/complaints/:id/resolve', adminController.resolveComplaint);

// Data Exports
router.get('/export/users', adminController.exportUsersCSV);
router.get('/export/vendors', adminController.exportVendorsCSV);
router.get('/export/orders', adminController.exportOrdersCSV);

export default router;
