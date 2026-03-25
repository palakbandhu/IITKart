import express from 'express';
import { getUserProfile, updateUserProfile, updatePassword } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.put('/profile/password', updatePassword);

export default router;