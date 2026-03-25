import express from 'express';
import {
  createProduct,
  getVendorProducts,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getCategories,
  getProductById,
} from '../controllers/productController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { Role } from '@prisma/client';

const router = express.Router();

// ── Public routes ─────────────────────────────────────────────────────────────
router.get('/',             getAllProducts);
router.get('/categories',   getCategories);
// NOTE: /vendor and /categories must come before /:id to avoid route conflicts
router.get('/:id',          getProductById);

// ── Vendor-only routes ────────────────────────────────────────────────────────
router.get('/vendor',       protect, authorize(Role.VENDOR), getVendorProducts);
router.post('/',            protect, authorize(Role.VENDOR), createProduct);
router.put('/:id',          protect, authorize(Role.VENDOR), updateProduct);
router.delete('/:id',       protect, authorize(Role.VENDOR), deleteProduct);

export default router;
