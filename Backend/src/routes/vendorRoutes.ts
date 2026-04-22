import { Router } from 'express';
import * as vendorController from '../controllers/vendorController';
import { verifyToken, requireRole } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = Router();

// Public routes
router.get('/', vendorController.getVendors);
router.get('/products', vendorController.getAllProducts);
router.get('/:id', vendorController.getVendorById);

// Protected routes (Vendor only)
router.use('/me', verifyToken, requireRole('vendor'));

router.get('/me/profile', vendorController.getVendorProfile);
router.patch('/me/profile', vendorController.updateVendorProfile);

router.get('/me/products', vendorController.getVendorProducts);
router.post('/me/products', upload.single('image'), vendorController.addProduct);
router.patch('/me/products/:id', upload.single('image'), vendorController.updateProduct);
router.delete('/me/products/:id', vendorController.deleteProduct);

router.get('/me/orders', vendorController.getVendorOrders);
router.patch('/me/orders/:orderId/accept', vendorController.acceptOrder);

router.get('/me/reviews', vendorController.getVendorReviews);
router.get('/me/analytics', vendorController.getVendorAnalytics);
router.get('/me/delivery-issues', vendorController.getVendorDeliveryIssues);
router.patch('/me/delivery-issues/:issueId/status', vendorController.updateDeliveryIssueStatus);

router.post('/me/courier-jobs', vendorController.createCourierJob);
router.patch('/me/courier-jobs/:jobId', vendorController.updateCourierJob);

export default router;
