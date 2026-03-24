import express from 'express';
// 1. Add sendOTPHandler to the imports
import { registerUser, loginUser, sendOTPHandler } from '../controllers/authController.js';

const router = express.Router();

// Existing routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// 2. Add the new route for sending OTP
router.post('/send-otp', sendOTPHandler);

export default router;