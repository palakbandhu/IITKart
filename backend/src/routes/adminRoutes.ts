import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  getStats
} from '../controllers/adminController.js';

const router = express.Router();

router.use(protect);
router.use(authorize('ADMIN'));

router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/status', updateUserStatus);
router.patch('/users/:id/role', updateUserRole);
router.get('/stats', getStats);

export default router;