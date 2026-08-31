import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  getRideHistory,
  getRideDetail
} from '../controllers/customer.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '@prisma/client';

import {
  getEstimate,
  createRide,
  cancelRide,
  confirmRidePayment
} from '../controllers/ride.controller';
import { submitCustomerRating } from '../controllers/rating.controller';
import {
  getCustomerNotifications,
  markCustomerNotificationRead,
  getActiveOffers
} from '../controllers/notification.controller';

const router = Router();

// All customer routes require authentication and CUSTOMER role
router.use(authenticate);
router.use(requireRole(UserRole.CUSTOMER));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/rides', getRideHistory);
router.post('/rides/estimate', getEstimate);
router.post('/rides', createRide);
router.get('/rides/:id', getRideDetail);
router.patch('/rides/:id/cancel', cancelRide);
router.post('/rides/:id/confirm-payment', confirmRidePayment);
router.post('/rides/:id/rating', submitCustomerRating);

// Notification bell
router.get('/notifications', getCustomerNotifications);
router.patch('/notifications/:id/read', markCustomerNotificationRead);

// Offers
router.get('/offers', getActiveOffers);

export default router;

