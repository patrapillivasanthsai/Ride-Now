import { Router } from 'express';
import {
  registerCustomer,
  registerDriver,
  login,
  getMe,
  updateFcmToken
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.post('/register/customer', registerCustomer);
router.post('/register/driver', registerDriver);
router.post('/login', login);

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
