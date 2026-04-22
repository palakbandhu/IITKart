import { Router } from 'express';
import * as authController from '../controllers/authController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtp);
router.post('/reset-password', authController.resetPassword);

router.post('/verify-email', authController.verifyRegistrationOtp);
router.post('/resend-otp', authController.resendRegistrationOtp);

router.get('/me', verifyToken, authController.getMe);

// Additional routes like /logout and /refresh can be mapped here similarly
// router.post('/logout', verifyToken, authController.logout);
// router.post('/refresh', authController.refresh);

export default router;
