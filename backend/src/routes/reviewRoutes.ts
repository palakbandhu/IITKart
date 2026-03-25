import express from 'express';
import { submitReview, getVendorReviews, getRiderReviews } from '../controllers/reviewController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { Role } from '@prisma/client';

const router = express.Router();

router.post('/',                  protect, authorize(Role.CUSTOMER), submitReview);
router.get('/vendor/:vendorId',   getVendorReviews);
router.get('/rider/:riderId',     getRiderReviews);

export default router;
