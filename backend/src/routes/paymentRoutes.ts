import express from 'express';
import { initiatePayment, verifyPayment, getTransactionHistory, getReceipt } from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { Role } from '@prisma/client';

const router = express.Router();

router.use(protect);
router.use(authorize(Role.CUSTOMER));

router.post('/initiate',             initiatePayment);
router.post('/verify',               verifyPayment);
router.get('/transactions',          getTransactionHistory);
router.get('/receipt/:orderId',      getReceipt);

export default router;
