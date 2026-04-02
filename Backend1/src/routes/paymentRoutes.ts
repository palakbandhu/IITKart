import { Router } from 'express';
import * as paymentController from '../controllers/paymentController';
import { verifyToken, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.use(verifyToken);

router.post('/create-razorpay-order', paymentController.createRazorpayOrder);
router.post('/verify', paymentController.verifyPayment);
router.get('/history', paymentController.getPaymentHistory);
router.get('/:orderId/receipt', paymentController.getReceipt);

export default router;
