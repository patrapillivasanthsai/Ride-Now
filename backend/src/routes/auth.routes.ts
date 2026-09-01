import { Router } from 'express';
import {
  registerCustomer,
  registerDriver,
  login,
  getMe,
  updateFcmToken
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

import {
  sendMobileOtp,
  verifyMobileOtp,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetForgotPassword
} from '../controllers/driverExtended.controller';

const router = Router();

// Public routes
router.post('/register/customer', registerCustomer);
router.post('/register/driver', registerDriver);
router.post('/login', login);

// Mobile OTP Auth
router.post('/otp/send-mobile', sendMobileOtp);
router.post('/otp/verify-mobile', verifyMobileOtp);

// Forgot Password Flow
router.post('/forgot-password/send-otp', sendForgotPasswordOtp);
router.post('/forgot-password/verify-otp', verifyForgotPasswordOtp);
router.post('/forgot-password/reset', resetForgotPassword);

// Protected routes
router.get('/me', authenticate, getMe);
router.post('/fcm-token', authenticate, updateFcmToken);

// Middleware test routes
import { requireRole, checkOwnership } from '../middlewares/auth.middleware';
import { UserRole } from '@prisma/client';

router.get('/admin-only', authenticate, requireRole(UserRole.ADMIN), (req, res) => {
  res.status(200).json({ success: true, message: 'Welcome Admin' });
});

router.get('/users/:id/private', authenticate, checkOwnership('id'), (req, res) => {
  res.status(200).json({ success: true, message: 'Owner verified' });
});

export default router;
