import express from 'express';
import { getWallet } from '../controllers/walletController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { Role } from '@prisma/client';

const router = express.Router();

router.get('/', protect, authorize(Role.CUSTOMER), getWallet);

export default router;
