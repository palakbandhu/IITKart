import express from 'express';
import { createOrder, getOrders, getOrderById, updateOrderStatus, cancelOrder } from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/',               protect, authorize('CUSTOMER'),         createOrder);
router.get('/',                protect,                                 getOrders);
router.get('/:id',             protect,                                 getOrderById);
router.patch('/:id/status',    protect, authorize('VENDOR', 'RIDER'),  updateOrderStatus);
router.patch('/:id/cancel',    protect, authorize('CUSTOMER'),          cancelOrder);

export default router;
