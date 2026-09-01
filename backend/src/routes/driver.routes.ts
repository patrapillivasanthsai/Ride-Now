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
  declineRide,
  releaseRide
} from '../controllers/ride.controller';
import { submitDriverRating } from '../controllers/rating.controller';
import {
  getDriverNotifications,
  markDriverNotificationRead
} from '../controllers/notification.controller';
import {
  getDriverDocuments,
  uploadDriverDocument,
  getPayoutSetup,
  savePayoutSetup,
  getSafetyTraining,
  completeSafetyTraining,
  getDriverWallet,
  requestWalletWithdrawal,
  getDriverReferrals,
  getSupportTickets,
  createSupportTicket,
  setPreferredArea
} from '../controllers/driverExtended.controller';

const router = Router();

// All driver routes require authentication and DRIVER role
router.use(authenticate);
router.use(requireRole(UserRole.DRIVER));

// Core Profile & Status
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/profile', updateProfile);
router.put('/status', updateProfile);
router.post('/status', updateProfile);
router.put('/vehicle', updateVehicle);
router.post('/vehicle', updateVehicle);
router.put('/location', updateLocation);

// Rides
router.get('/rides', getRides);
router.get('/rides/available', getAvailableRides);
router.get('/rides/:id', getRideDetail);
router.patch('/rides/:id/status', updateRideStatus);
router.post('/rides/:id/status', updateRideStatus);
router.patch('/rides/:id/accept', acceptRide);
router.post('/rides/:id/accept', acceptRide);
router.patch('/rides/:id/decline', declineRide);
router.post('/rides/:id/decline', declineRide);
router.patch('/rides/:id/release', releaseRide);
router.post('/rides/:id/release', releaseRide);
router.post('/rides/:id/rating', submitDriverRating);
router.get('/earnings', getEarnings);

// Notifications
router.get('/notifications', getDriverNotifications);
router.patch('/notifications/:id/read', markDriverNotificationRead);

// Documents Verification
router.get('/documents', getDriverDocuments);
router.post('/documents/upload', uploadDriverDocument);
router.post('/documents', uploadDriverDocument);
router.put('/documents', uploadDriverDocument);

// Payout Setup (Bank & UPI)
router.get('/payout-setup', getPayoutSetup);
router.post('/payout-setup', savePayoutSetup);
router.put('/payout-setup', savePayoutSetup);
router.get('/payout', getPayoutSetup);
router.post('/payout', savePayoutSetup);
router.put('/payout', savePayoutSetup);

// Training
router.get('/training', getSafetyTraining);
router.post('/training/complete', completeSafetyTraining);

// Wallet
router.get('/wallet', getDriverWallet);
router.post('/wallet/withdraw', requestWalletWithdrawal);

// Referrals
router.get('/referrals', getDriverReferrals);

// Support
router.get('/support/tickets', getSupportTickets);
router.post('/support/tickets', createSupportTicket);

// Preferences
router.put('/preferred-area', setPreferredArea);

export default router;
