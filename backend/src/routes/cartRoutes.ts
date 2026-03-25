import express from 'express';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from '../controllers/cartController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { Role } from '@prisma/client';

const router = express.Router();

router.use(protect);
router.use(authorize(Role.CUSTOMER));

router.get('/',          getCart);
router.post('/add',      addToCart);
router.patch('/update',  updateCartItem);
router.delete('/remove', removeFromCart);
router.delete('/clear',  clearCart);

export default router;
