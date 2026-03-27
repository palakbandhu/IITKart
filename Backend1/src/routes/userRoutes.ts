import { Router } from 'express';
import * as userController from '../controllers/userController';
import { verifyToken, requireRole } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = Router();

router.use(verifyToken);

// Accessible by any authenticated role
router.get('/profile', userController.getProfile);
router.patch('/profile', upload.single('photo'), userController.updateProfile);
router.post('/update-email', userController.requestEmailUpdate);
router.post('/verify-email-change', userController.verifyEmailChange);

// Strictly accessible by customers
router.use(requireRole('user'));

router.get('/favorites', userController.getFavorites);
router.post('/favorites/:productId', userController.toggleFavorite);

router.get('/wallet', userController.getWallet);
router.get('/orders', userController.getUserOrders);
router.get('/complaints', userController.getUserComplaints);

export default router;
