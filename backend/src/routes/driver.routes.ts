import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  updateVehicle,
  updateLocation,
  getRides,
  getRideDetail,
  getEarnings
} from '../controllers/driver.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '@prisma/client';

import {
  updateRideStatus,
  getAvailableRides,
  acceptRide,
  releaseRide
} from '../controllers/ride.controller';
import { submitDriverRating } from '../controllers/rating.controller';
import {
  getDriverNotifications,
  markDriverNotificationRead
} from '../controllers/notification.controller';

const router = Router();

// All driver routes require authentication and DRIVER role
router.use(authenticate);
router.use(requireRole(UserRole.DRIVER));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/vehicle', updateVehicle);
router.put('/location', updateLocation);
router.get('/rides', getRides);
router.get('/rides/available', getAvailableRides);
router.get('/rides/:id', getRideDetail);
router.patch('/rides/:id/status', updateRideStatus);
router.patch('/rides/:id/accept', acceptRide);
router.patch('/rides/:id/release', releaseRide);
router.post('/rides/:id/rating', submitDriverRating);
router.get('/earnings', getEarnings);

// Notification bell
router.get('/notifications', getDriverNotifications);
router.patch('/notifications/:id/read', markDriverNotificationRead);

export default router;

