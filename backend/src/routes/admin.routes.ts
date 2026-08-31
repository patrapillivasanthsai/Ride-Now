import { Router } from 'express';
import {
  getStats,
  getDrivers, approveDriver, rejectDriver, suspendDriver, activateDriver,
  getRides, getRideDetail, getEligibleDrivers, assignDriver, adminCancelRide,
  getPricing, updatePricing,
  getAdminPayments, getAdminPaymentDetail,
  getCustomers, getCustomerDetail, suspendCustomer, reactivateCustomer,
  getAnalytics,
  getRatings, flagRating, resolveRating,
  getAdminNotifications, createAdminNotification,
  getOffers, createOffer, updateOffer, deleteOffer,
  getStaff, createStaff, updateStaff,
  getAuditLogs,
  getSettings, updateSettings
} from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(requireRole(UserRole.ADMIN));

// ── Stats ────────────────────────────────────────────────────────────────────
router.get('/stats', getStats);

// ── Drivers ──────────────────────────────────────────────────────────────────
router.get('/drivers', getDrivers);
router.patch('/drivers/:id/approve', approveDriver);
router.patch('/drivers/:id/reject', rejectDriver);
router.patch('/drivers/:id/suspend', suspendDriver);
router.patch('/drivers/:id/activate', activateDriver);

// ── Rides ─────────────────────────────────────────────────────────────────────
router.get('/rides', getRides);
router.get('/rides/:id', getRideDetail);
router.get('/rides/:id/eligible-drivers', getEligibleDrivers);
router.post('/rides/:id/assign-driver', assignDriver);
router.post('/rides/:id/cancel', adminCancelRide);

// ── Pricing ───────────────────────────────────────────────────────────────────
router.get('/pricing', getPricing);
router.put('/pricing/:vehicleType', updatePricing);

// ── Payments ──────────────────────────────────────────────────────────────────
router.get('/payments', getAdminPayments);
router.get('/payments/:id', getAdminPaymentDetail);

// ── Customers ─────────────────────────────────────────────────────────────────
router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomerDetail);
router.patch('/customers/:id/suspend', suspendCustomer);
router.patch('/customers/:id/reactivate', reactivateCustomer);

// ── Analytics ─────────────────────────────────────────────────────────────────
router.get('/analytics', getAnalytics);

// ── Ratings ───────────────────────────────────────────────────────────────────
router.get('/ratings', getRatings);
router.patch('/ratings/:id/flag', flagRating);
router.patch('/ratings/:id/resolve', resolveRating);

// ── Notifications ─────────────────────────────────────────────────────────────
router.get('/notifications', getAdminNotifications);
router.post('/notifications', createAdminNotification);

// ── Offers ────────────────────────────────────────────────────────────────────
router.get('/offers', getOffers);
router.post('/offers', createOffer);
router.put('/offers/:id', updateOffer);
router.delete('/offers/:id', deleteOffer);

// ── Staff ─────────────────────────────────────────────────────────────────────
router.get('/staff', getStaff);
router.post('/staff', createStaff);
router.put('/staff/:id', updateStaff);

// ── Audit Logs ────────────────────────────────────────────────────────────────
router.get('/audit-logs', getAuditLogs);

// ── Settings ──────────────────────────────────────────────────────────────────
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

export default router;
