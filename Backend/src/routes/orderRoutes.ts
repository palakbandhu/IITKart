import { Router } from 'express';
import * as orderController from '../controllers/orderController';
import { verifyToken, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.use(verifyToken);

router.post('/validate-cart', requireRole('user'), orderController.validateCart);
router.post('/', requireRole('user'), orderController.placeOrder);
router.get('/queue/status', orderController.getQueueStatus);
router.get('/active', requireRole('admin', 'vendor', 'courier'), orderController.getActiveOrders);

router.get('/:id', orderController.getOrderById);
router.patch('/:id/status', requireRole('vendor', 'courier', 'admin', 'user'), orderController.updateOrderStatus);
router.patch('/:id/assign-courier', requireRole('admin', 'vendor'), orderController.assignCourier);
router.patch('/:id/rate', requireRole('user'), orderController.rateOrder);
router.post('/:id/complaint', requireRole('user'), orderController.submitComplaint);

export default router;
