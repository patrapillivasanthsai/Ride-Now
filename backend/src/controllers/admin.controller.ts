import { Request, Response } from 'express';
import {
  PrismaClient,
  RideStatus,
  VehicleType,
  DriverStatus,
  PaymentStatus,
  UserRole,
  AuditAction,
  NotificationType,
  NotificationTargetRole,
  StaffRole
} from '@prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { emitToRide, emitToUser, emitToRole } from '../socket';
import { sendPushNotification } from '../utils/firebase';
import bcrypt from 'bcryptjs';
import { calculateDistance } from './ride.controller';

const prisma = new PrismaClient();

// â”€â”€â”€ Helper: Write Audit Log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function writeAuditLog(
  actorUserId: string,
  action: AuditAction,
  targetType?: string,
  targetId?: string,
  metadata?: any
) {
  try {
    // Find or create AdminStaff record for this user
    let staff = await prisma.adminStaff.findUnique({ where: { userId: actorUserId } });
    if (!staff) {
      staff = await prisma.adminStaff.create({
        data: { userId: actorUserId, staffRole: StaffRole.SUPER_ADMIN }
      });
    }
    await prisma.auditLog.create({
      data: { actorId: staff.id, action, targetType, targetId, metadata }
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// â”€â”€â”€ GET /api/admin/stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getStats(req: AuthenticatedRequest, res: Response) {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [
      totalUsers, totalCustomers, totalDrivers,
      onlineDrivers, offlineDrivers, busyDrivers,
      totalRides, completedRides, cancelledRides,
      ongoingRides, todayRides, pendingApprovals,
      revenueResult, todayRevenueResult,
      paymentSuccess, paymentFailed, paymentPending
    ] = await Promise.all([
      prisma.user.count(),
      prisma.customer.count(),
      prisma.driver.count(),
      prisma.driver.count({ where: { status: DriverStatus.ONLINE } }),
      prisma.driver.count({ where: { status: DriverStatus.OFFLINE } }),
      prisma.driver.count({ where: { status: DriverStatus.BUSY } }),
      prisma.ride.count(),
      prisma.ride.count({ where: { status: RideStatus.RIDE_COMPLETED } }),
      prisma.ride.count({ where: { status: RideStatus.CANCELLED } }),
      prisma.ride.count({
        where: {
          status: {
            in: [RideStatus.SEARCHING_DRIVER, RideStatus.DRIVER_ASSIGNED, RideStatus.DRIVER_ARRIVING, RideStatus.DRIVER_ARRIVED, RideStatus.RIDE_STARTED]
          }
        }
      }),
      prisma.ride.count({ where: { createdAt: { gte: todayStart, lt: todayEnd } } }),
      prisma.driver.count({ where: { isApproved: false, isSuspended: false } }),
      prisma.ride.aggregate({ where: { status: RideStatus.RIDE_COMPLETED }, _sum: { fare: true } }),
      prisma.ride.aggregate({ where: { status: RideStatus.RIDE_COMPLETED, createdAt: { gte: todayStart, lt: todayEnd } }, _sum: { fare: true } }),
      prisma.payment.count({ where: { status: PaymentStatus.COMPLETED } }),
      prisma.payment.count({ where: { status: PaymentStatus.FAILED } }),
      prisma.payment.count({ where: { status: PaymentStatus.PENDING } }),
    ]);

    // Recent rides
    const recentRides = await prisma.ride.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, phone: true } },
        driver: { select: { name: true, phone: true } }
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        totalUsers, totalCustomers, totalDrivers,
        driversBreakdown: { online: onlineDrivers, offline: offlineDrivers, busy: busyDrivers },
        totalRides, completedRides, cancelledRides, ongoingRides,
        todayRides, pendingApprovals,
        completedFaresSum: revenueResult._sum.fare || 0,
        todayRevenue: todayRevenueResult._sum.fare || 0,
        paymentsBreakdown: { success: paymentSuccess, failed: paymentFailed, pending: paymentPending },
        recentRides
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ GET /api/admin/drivers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getDrivers(req: AuthenticatedRequest, res: Response) {
  const { isApproved, status, vehicleType, search } = req.query;

  try {
    const whereClause: any = {};
    if (isApproved !== undefined) whereClause.isApproved = isApproved === 'true';
    if (status && status !== 'ALL') whereClause.status = status as DriverStatus;
    if (vehicleType && vehicleType !== 'ALL') whereClause.vehicle = { type: vehicleType as VehicleType };
    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
        { user: { email: { contains: search as string, mode: 'insensitive' } } }
      ];
    }

    const drivers = await prisma.driver.findMany({
      where: whereClause,
      include: {
        user: { select: { email: true, createdAt: true } },
        vehicle: true,
        driverLocation: true,
        rides: { where: { status: RideStatus.RIDE_COMPLETED }, select: { fare: true } },
        ratings: { select: { score: true, raterRole: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enriched = drivers.map((driver) => {
      const totalFare = driver.rides.reduce((sum, r) => sum + r.fare, 0);
      const totalEarnings = parseFloat((totalFare * 0.80).toFixed(2));
      const driverRatings = driver.ratings.filter(r => r.raterRole === UserRole.CUSTOMER);
      const avgRating = driverRatings.length > 0
        ? parseFloat((driverRatings.reduce((sum, r) => sum + r.score, 0) / driverRatings.length).toFixed(1))
        : null;
      return {
        id: driver.id, userId: driver.userId, name: driver.name, phone: driver.phone,
        isApproved: driver.isApproved, isSuspended: driver.isSuspended, suspendReason: driver.suspendReason,
        status: driver.status, licenseNumber: driver.licenseNumber,
        createdAt: driver.createdAt, user: driver.user, vehicle: driver.vehicle,
        driverLocation: driver.driverLocation, totalRides: driver.rides.length,
        totalEarnings, avgRating
      };
    });

    return res.status(200).json({ success: true, data: enriched });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ PATCH /api/admin/drivers/:id/approve â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function approveDriver(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  try {
    const driver = await prisma.driver.findUnique({ where: { id }, include: { user: true } });
    if (!driver) return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' } });

    const updated = await prisma.driver.update({ where: { id }, data: { isApproved: true } });

    // Send notification to driver
    await prisma.driverNotification.create({
      data: {
        driverId: id,
        title: 'âœ… Account Approved',
        body: 'Your driver account has been approved! You can now go online and accept rides.',
        type: NotificationType.APPROVAL
      }
    });

    // Push notification
    await sendPushNotification(driver.user.fcmToken, 'Account Approved ðŸŽ‰', 'You can now go online and accept rides!');

    // Real-time update
    emitToUser(driver.userId, 'account_status_updated', { isApproved: true });

    await writeAuditLog(req.user!.id, AuditAction.DRIVER_APPROVED, 'Driver', id);

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ PATCH /api/admin/drivers/:id/reject â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function rejectDriver(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const driver = await prisma.driver.findUnique({ where: { id }, include: { user: true } });
    if (!driver) return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' } });

    const updated = await prisma.driver.update({ where: { id }, data: { isApproved: false } });

    await prisma.driverNotification.create({
      data: {
        driverId: id,
        title: 'âŒ Application Review Required',
        body: reason || 'Your driver application requires additional review. Please contact support.',
        type: NotificationType.APPROVAL
      }
    });

    await sendPushNotification(driver.user.fcmToken, 'Application Update', reason || 'Your driver application requires review.');
    emitToUser(driver.userId, 'account_status_updated', { isApproved: false, reason });

    await writeAuditLog(req.user!.id, AuditAction.DRIVER_REJECTED, 'Driver', id, { reason });

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ PATCH /api/admin/drivers/:id/suspend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function suspendDriver(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Suspension reason is required' } });

  try {
    const driver = await prisma.driver.findUnique({ where: { id }, include: { user: true } });
    if (!driver) return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' } });

    const updated = await prisma.driver.update({
      where: { id },
      data: { isSuspended: true, suspendedAt: new Date(), suspendReason: reason, status: DriverStatus.OFFLINE }
    });

    await prisma.driverNotification.create({
      data: { driverId: id, title: 'âš ï¸ Account Suspended', body: `Your account has been suspended: ${reason}`, type: NotificationType.SYSTEM }
    });

    await sendPushNotification(driver.user.fcmToken, 'Account Suspended', `Your account has been suspended: ${reason}`);
    emitToUser(driver.userId, 'account_suspended', { reason });

    await writeAuditLog(req.user!.id, AuditAction.DRIVER_SUSPENDED, 'Driver', id, { reason });

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ PATCH /api/admin/drivers/:id/activate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function activateDriver(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  try {
    const driver = await prisma.driver.findUnique({ where: { id }, include: { user: true } });
    if (!driver) return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' } });

    const updated = await prisma.driver.update({
      where: { id },
      data: { isSuspended: false, suspendedAt: null, suspendReason: null }
    });

    await prisma.driverNotification.create({
      data: { driverId: id, title: 'âœ… Account Reinstated', body: 'Your account has been reinstated. You can now go online.', type: NotificationType.SYSTEM }
    });

    await sendPushNotification(driver.user.fcmToken, 'Account Reinstated', 'Your account has been reinstated.');
    emitToUser(driver.userId, 'account_activated', {});

    await writeAuditLog(req.user!.id, AuditAction.DRIVER_ACTIVATED, 'Driver', id);

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ GET /api/admin/rides â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getRides(req: AuthenticatedRequest, res: Response) {
  const { status, vehicleType, page = '1', limit = '20', search, dateFrom, dateTo } = req.query;

  try {
    const whereClause: any = {};
    if (status && status !== 'ALL') whereClause.status = status as RideStatus;
    if (vehicleType && vehicleType !== 'ALL') whereClause.vehicleType = vehicleType as VehicleType;
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) whereClause.createdAt.lte = new Date(dateTo as string);
    }
    if (search) {
      whereClause.OR = [
        { id: { contains: search as string, mode: 'insensitive' } },
        { customer: { user: { email: { contains: search as string, mode: 'insensitive' } } } },
        { driver: { user: { email: { contains: search as string, mode: 'insensitive' } } } },
        { pickupAddress: { contains: search as string, mode: 'insensitive' } },
        { dropoffAddress: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [rides, total] = await Promise.all([
      prisma.ride.findMany({
        where: whereClause,
        include: {
          customer: { select: { name: true, phone: true, user: { select: { email: true } } } },
          driver: { select: { name: true, phone: true, vehicle: true, user: { select: { email: true } } } },
          payments: { select: { status: true, paymentMethod: true, amount: true }, take: 1 }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.ride.count({ where: whereClause })
    ]);

    return res.status(200).json({
      success: true,
      data: rides,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ GET /api/admin/rides/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getRideDetail(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  try {
    const ride = await prisma.ride.findUnique({
      where: { id },
      include: {
        statusHistory: { orderBy: { createdAt: 'asc' } },
        customer: { select: { name: true, phone: true, user: { select: { email: true } } } },
        driver: { select: { name: true, phone: true, vehicle: true, user: { select: { email: true } }, driverLocation: true } },
        payments: true,
        ratings: { include: { customer: { select: { name: true } } } }
      }
    });

    if (!ride) return res.status(404).json({ success: false, error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' } });

    return res.status(200).json({ success: true, data: ride });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ GET /api/admin/rides/:id/eligible-drivers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getEligibleDrivers(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  try {
    const ride = await prisma.ride.findUnique({ where: { id } });
    if (!ride) return res.status(404).json({ success: false, error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' } });

    const eligibleDrivers = await prisma.driver.findMany({
      where: {
        isApproved: true,
        isSuspended: false,
        status: { in: [DriverStatus.ONLINE, DriverStatus.OFFLINE] },
        vehicle: { type: ride.vehicleType }
      },
      include: {
        vehicle: true,
        driverLocation: true,
        ratings: { select: { score: true, raterRole: true } }
      }
    });

    // Sort by distance if location available
    const enriched = eligibleDrivers.map((d) => {
      const loc = d.driverLocation;
      const distanceFromPickup = loc
        ? calculateDistance(ride.pickupLat, ride.pickupLng, loc.lat, loc.lng)
        : null;
      const driverRatings = d.ratings.filter(r => r.raterRole === UserRole.CUSTOMER);
      const avgRating = driverRatings.length > 0
        ? parseFloat((driverRatings.reduce((s, r) => s + r.score, 0) / driverRatings.length).toFixed(1))
        : null;
      return { id: d.id, name: d.name, phone: d.phone, status: d.status, vehicle: d.vehicle, driverLocation: d.driverLocation, distanceFromPickup, avgRating };
    }).sort((a, b) => {
      if (a.distanceFromPickup === null) return 1;
      if (b.distanceFromPickup === null) return -1;
      return a.distanceFromPickup - b.distanceFromPickup;
    });

    return res.status(200).json({ success: true, data: enriched });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ POST /api/admin/rides/:id/assign-driver â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function assignDriver(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { driverId } = req.body;

  if (!driverId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'driverId is required' } });

  try {
    const ride = await prisma.ride.findUnique({ where: { id } });
    if (!ride) return res.status(404).json({ success: false, error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' } });

    // Only allow assignment for rides not yet assigned or completed/cancelled
    const assignableStatuses: RideStatus[] = [RideStatus.REQUESTED, RideStatus.SEARCHING_DRIVER, RideStatus.NO_DRIVER_AVAILABLE];
    if (!assignableStatuses.includes(ride.status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: `Cannot assign driver to ride with status: ${ride.status}` }
      });
    }

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { vehicle: true, user: true }
    });
    if (!driver) return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' } });

    // Validate vehicle type compatibility
    if (driver.vehicle?.type !== ride.vehicleType) {
      return res.status(400).json({
        success: false,
        error: { code: 'INCOMPATIBLE_VEHICLE', message: `Driver vehicle type (${driver.vehicle?.type}) does not match ride type (${ride.vehicleType})` }
      });
    }

    if (!driver.isApproved || driver.isSuspended) {
      return res.status(400).json({ success: false, error: { code: 'DRIVER_NOT_ELIGIBLE', message: 'Driver is not approved or is suspended' } });
    }

    // Update ride and driver in transaction
    const [updatedRide] = await prisma.$transaction([
      prisma.ride.update({
        where: { id },
        data: { driverId, status: RideStatus.DRIVER_ASSIGNED }
      }),
      prisma.rideStatusHistory.create({
        data: { rideId: id, status: RideStatus.DRIVER_ASSIGNED, note: 'Manually assigned by admin' }
      }),
      prisma.driver.update({ where: { id: driverId }, data: { status: DriverStatus.BUSY } })
    ]);

    // Notify driver
    await prisma.driverNotification.create({
      data: {
        driverId, title: 'ðŸš— New Ride Assignment',
        body: `You have been assigned a ride by admin. Pickup: ${ride.pickupAddress}`,
        type: NotificationType.RIDE_UPDATE
      }
    });

    // Socket emissions
    emitToRide(id, 'ride_status_updated', { rideId: id, status: RideStatus.DRIVER_ASSIGNED, driver: { id: driverId, name: driver.name } });
    emitToUser(driver.userId, 'ride_assigned', { rideId: id, status: RideStatus.DRIVER_ASSIGNED });

    // Find customer user and notify
    const rideWithCustomer = await prisma.ride.findUnique({
      where: { id },
      include: { customer: { include: { user: true } } }
    });
    if (rideWithCustomer?.customer) {
      emitToUser(rideWithCustomer.customer.userId, 'ride_status_updated', {
        rideId: id, status: RideStatus.DRIVER_ASSIGNED,
        driver: { id: driverId, name: driver.name, phone: driver.phone, vehicle: driver.vehicle }
      });
    }

    await writeAuditLog(req.user!.id, AuditAction.RIDE_DRIVER_ASSIGNED, 'Ride', id, { driverId });

    return res.status(200).json({ success: true, data: updatedRide });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ POST /api/admin/rides/:id/cancel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function adminCancelRide(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Cancellation reason is required' } });

  try {
    const ride = await prisma.ride.findUnique({
      where: { id },
      include: {
        customer: { include: { user: true } },
        driver: { include: { user: true } },
        payments: true
      }
    });
    if (!ride) return res.status(404).json({ success: false, error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' } });

    // Cannot cancel already completed or cancelled rides
    if (ride.status === RideStatus.RIDE_COMPLETED || ride.status === RideStatus.CANCELLED) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: `Cannot cancel ride with status: ${ride.status}` } });
    }

    // Atomic transaction
    const updatedRide = await prisma.$transaction(async (tx) => {
      const updated = await tx.ride.update({
        where: { id },
        data: { status: RideStatus.CANCELLED, cancelReason: reason, cancelledBy: 'ADMIN' }
      });
      await tx.rideStatusHistory.create({
        data: { rideId: id, status: RideStatus.CANCELLED, note: `Admin cancelled: ${reason}` }
      });

      // Release driver if assigned
      if (ride.driverId) {
        await tx.driver.update({ where: { id: ride.driverId }, data: { status: DriverStatus.ONLINE } });
      }

      // Handle payment - refund if completed
      const payment = ride.payments[0];
      if (payment && payment.status === PaymentStatus.AUTHORIZED) {
        await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.REFUNDED } });
      }

      return updated;
    });

    // Notify customer
    if (ride.customer) {
      await prisma.notification.create({
        data: {
          customerId: ride.customer.id,
          title: 'ðŸš« Ride Cancelled',
          body: `Your ride has been cancelled by admin. Reason: ${reason}`,
          type: NotificationType.RIDE_UPDATE
        }
      });
      emitToUser(ride.customer.userId, 'ride_cancelled', { rideId: id, reason, cancelledBy: 'ADMIN' });
      await sendPushNotification(ride.customer.user.fcmToken, 'Ride Cancelled', `Your ride was cancelled: ${reason}`);
    }

    // Notify driver if assigned
    if (ride.driverId && ride.driver) {
      await prisma.driverNotification.create({
        data: {
          driverId: ride.driverId,
          title: 'ðŸš« Ride Cancelled',
          body: `Admin has cancelled the ride. Reason: ${reason}`,
          type: NotificationType.RIDE_UPDATE
        }
      });
      emitToUser(ride.driver.userId, 'ride_cancelled', { rideId: id, reason, cancelledBy: 'ADMIN' });
    }

    emitToRide(id, 'ride_status_updated', { rideId: id, status: RideStatus.CANCELLED, reason });

    await writeAuditLog(req.user!.id, AuditAction.RIDE_CANCELLED, 'Ride', id, { reason });

    return res.status(200).json({ success: true, data: updatedRide });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ GET /api/admin/pricing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getPricing(req: AuthenticatedRequest, res: Response) {
  try {
    const pricing = await prisma.pricing.findMany({ orderBy: { vehicleType: 'asc' } });
    return res.status(200).json({ success: true, data: pricing });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ PUT /api/admin/pricing/:vehicleType â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function updatePricing(req: AuthenticatedRequest, res: Response) {
  const { vehicleType } = req.params;
  const { baseFare, perKmRate, perMinuteRate, minimumFare } = req.body;

  if (baseFare === undefined || perKmRate === undefined || perMinuteRate === undefined) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'baseFare, perKmRate, and perMinuteRate are required' } });
  }

  const base = parseFloat(baseFare);
  const km = parseFloat(perKmRate);
  const min = parseFloat(perMinuteRate);
  const minFare = parseFloat(minimumFare || '0');

  if (isNaN(base) || isNaN(km) || isNaN(min) || base < 0 || km < 0 || min < 0) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Rates must be valid non-negative numbers' } });
  }

  if (!Object.values(VehicleType).includes(vehicleType as any)) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid vehicle type' } });
  }

  try {
    const updated = await prisma.pricing.upsert({
      where: { vehicleType: vehicleType as VehicleType },
      update: { baseFare: base, perKmRate: km, perMinuteRate: min, minimumFare: minFare },
      create: { vehicleType: vehicleType as VehicleType, baseFare: base, perKmRate: km, perMinuteRate: min, minimumFare: minFare }
    });

    await writeAuditLog(req.user!.id, AuditAction.PRICING_UPDATED, 'Pricing', vehicleType, { baseFare: base, perKmRate: km, perMinuteRate: min, minimumFare: minFare });

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ GET /api/admin/payments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getAdminPayments(req: AuthenticatedRequest, res: Response) {
  const { status, paymentMethod, dateFrom, dateTo, page = '1', limit = '20', search } = req.query;

  try {
    const whereClause: any = {};
    if (status && status !== 'ALL') whereClause.status = status as PaymentStatus;
    if (paymentMethod && paymentMethod !== 'ALL') whereClause.paymentMethod = paymentMethod;
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) whereClause.createdAt.lte = new Date(dateTo as string);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: whereClause,
        include: {
          ride: {
            select: {
              id: true, vehicleType: true, fare: true,
              customer: { select: { name: true, phone: true, user: { select: { email: true } } } },
              driver: { select: { name: true, phone: true, user: { select: { email: true } } } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      }),
      prisma.payment.count({ where: whereClause })
    ]);

    return res.status(200).json({
      success: true, data: payments,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ GET /api/admin/payments/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getAdminPaymentDetail(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  try {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        ride: {
          include: {
            customer: { select: { name: true, phone: true, user: { select: { email: true } } } },
            driver: { select: { name: true, phone: true, user: { select: { email: true } } } }
          }
        }
      }
    });

    if (!payment) return res.status(404).json({ success: false, error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' } });

    return res.status(200).json({ success: true, data: payment });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ GET /api/admin/customers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getCustomers(req: AuthenticatedRequest, res: Response) {
  const { search, isSuspended } = req.query;
  try {
    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
        { user: { email: { contains: search as string, mode: 'insensitive' } } }
      ];
    }
    if (isSuspended !== undefined) whereClause.isSuspended = isSuspended === 'true';

    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: { user: { select: { email: true, createdAt: true } }, rides: { select: { id: true, fare: true, status: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = customers.map((c) => {
      const completedRides = c.rides.filter(r => r.status === RideStatus.RIDE_COMPLETED);
      const cancelledRides = c.rides.filter(r => r.status === RideStatus.CANCELLED);
      const totalSpent = completedRides.reduce((sum, r) => sum + r.fare, 0);
      return {
        id: c.id, userId: c.userId, name: c.name, phone: c.phone, gender: c.gender,
        email: c.user.email, createdAt: c.user.createdAt,
        isSuspended: c.isSuspended, suspendReason: c.suspendReason,
        totalRides: c.rides.length, completedRides: completedRides.length,
        cancelledRides: cancelledRides.length, totalSpent: parseFloat(totalSpent.toFixed(2))
      };
    });

    return res.status(200).json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ GET /api/admin/customers/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getCustomerDetail(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, createdAt: true } },
        rides: { orderBy: { createdAt: 'desc' }, include: { payments: { select: { status: true, paymentMethod: true, amount: true } } } },
        ratings: { select: { score: true, comment: true, raterRole: true, createdAt: true } }
      }
    });

    if (!customer) return res.status(404).json({ success: false, error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' } });

    return res.status(200).json({ success: true, data: customer });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ PATCH /api/admin/customers/:id/suspend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function suspendCustomer(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Reason is required' } });

  try {
    const customer = await prisma.customer.findUnique({ where: { id }, include: { user: true } });
    if (!customer) return res.status(404).json({ success: false, error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' } });

    const updated = await prisma.customer.update({
      where: { id }, data: { isSuspended: true, suspendedAt: new Date(), suspendReason: reason }
    });

    await prisma.notification.create({
      data: { customerId: id, title: 'âš ï¸ Account Suspended', body: `Your account has been suspended: ${reason}`, type: NotificationType.SYSTEM }
    });
    emitToUser(customer.userId, 'account_suspended', { reason });
    await sendPushNotification(customer.user.fcmToken, 'Account Suspended', `Your account has been suspended: ${reason}`);

    await writeAuditLog(req.user!.id, AuditAction.CUSTOMER_SUSPENDED, 'Customer', id, { reason });

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ PATCH /api/admin/customers/:id/reactivate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function reactivateCustomer(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  try {
    const customer = await prisma.customer.findUnique({ where: { id }, include: { user: true } });
    if (!customer) return res.status(404).json({ success: false, error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' } });

    const updated = await prisma.customer.update({
      where: { id }, data: { isSuspended: false, suspendedAt: null, suspendReason: null }
    });

    await prisma.notification.create({
      data: { customerId: id, title: 'âœ… Account Reactivated', body: 'Your account has been reactivated. Welcome back!', type: NotificationType.SYSTEM }
    });
    emitToUser(customer.userId, 'account_activated', {});

    await writeAuditLog(req.user!.id, AuditAction.CUSTOMER_REACTIVATED, 'Customer', id);

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ GET /api/admin/analytics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getAnalytics(req: AuthenticatedRequest, res: Response) {
  const { period = '7' } = req.query;
  const days = parseInt(period as string);

  try {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);

    // Daily rides and revenue for the period
    const dailyData: any[] = [];
    for (let i = 0; i < days; i++) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - (days - 1 - i));
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const [ridesCount, revenueResult, completedCount, cancelledCount] = await Promise.all([
        prisma.ride.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
        prisma.ride.aggregate({ where: { status: RideStatus.RIDE_COMPLETED, createdAt: { gte: dayStart, lt: dayEnd } }, _sum: { fare: true } }),
        prisma.ride.count({ where: { status: RideStatus.RIDE_COMPLETED, createdAt: { gte: dayStart, lt: dayEnd } } }),
        prisma.ride.count({ where: { status: RideStatus.CANCELLED, createdAt: { gte: dayStart, lt: dayEnd } } })
      ]);

      dailyData.push({
        date: dayStart.toISOString().split('T')[0],
        rides: ridesCount,
        revenue: revenueResult._sum.fare || 0,
        completed: completedCount,
        cancelled: cancelledCount
      });
    }

    // Vehicle type breakdown
    const vehicleBreakdown = await Promise.all(
      Object.values(VehicleType).map(async (vt) => ({
        vehicleType: vt,
        count: await prisma.ride.count({ where: { vehicleType: vt, createdAt: { gte: periodStart } } })
      }))
    );

    // Overall KPIs
    const [totalRides, completedRides, cancelledRides, totalRevenue, newCustomers, newDrivers] = await Promise.all([
      prisma.ride.count({ where: { createdAt: { gte: periodStart } } }),
      prisma.ride.count({ where: { status: RideStatus.RIDE_COMPLETED, createdAt: { gte: periodStart } } }),
      prisma.ride.count({ where: { status: RideStatus.CANCELLED, createdAt: { gte: periodStart } } }),
      prisma.ride.aggregate({ where: { status: RideStatus.RIDE_COMPLETED, createdAt: { gte: periodStart } }, _sum: { fare: true } }),
      prisma.customer.count({ where: { createdAt: { gte: periodStart } } }),
      prisma.driver.count({ where: { createdAt: { gte: periodStart } } })
    ]);

    const completionRate = totalRides > 0 ? parseFloat(((completedRides / totalRides) * 100).toFixed(1)) : 0;
    const cancellationRate = totalRides > 0 ? parseFloat(((cancelledRides / totalRides) * 100).toFixed(1)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        dailyData,
        vehicleBreakdown,
        kpis: {
          totalRides, completedRides, cancelledRides,
          totalRevenue: totalRevenue._sum.fare || 0,
          completionRate, cancellationRate,
          newCustomers, newDrivers
        },
        period: days
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ GET /api/admin/ratings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getRatings(req: AuthenticatedRequest, res: Response) {
  const { score, isFlagged, raterRole, page = '1', limit = '20' } = req.query;

  try {
    const whereClause: any = {};
    if (score) whereClause.score = parseInt(score as string);
    if (isFlagged !== undefined) whereClause.isFlagged = isFlagged === 'true';
    if (raterRole) whereClause.raterRole = raterRole as UserRole;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [ratings, total] = await Promise.all([
      prisma.rating.findMany({
        where: whereClause,
        include: {
          customer: { select: { name: true, phone: true } },
          driver: { select: { name: true, phone: true } },
          ride: { select: { id: true, vehicleType: true, pickupAddress: true, dropoffAddress: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      }),
      prisma.rating.count({ where: whereClause })
    ]);

    return res.status(200).json({
      success: true, data: ratings,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ PATCH /api/admin/ratings/:id/flag â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function flagRating(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { flagReason } = req.body;
  if (!flagReason) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'flagReason is required' } });

  try {
    const updated = await prisma.rating.update({ where: { id }, data: { isFlagged: true, flagReason } });
    await writeAuditLog(req.user!.id, AuditAction.RATING_FLAGGED, 'Rating', id, { flagReason });
    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ PATCH /api/admin/ratings/:id/resolve â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function resolveRating(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { resolveNote } = req.body;
  if (!resolveNote) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'resolveNote is required' } });

  try {
    const updated = await prisma.rating.update({ where: { id }, data: { isResolved: true, resolveNote } });
    await writeAuditLog(req.user!.id, AuditAction.RATING_RESOLVED, 'Rating', id, { resolveNote });
    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ GET /api/admin/notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getAdminNotifications(req: AuthenticatedRequest, res: Response) {
  const { targetRole, page = '1', limit = '20' } = req.query;
  try {
    const whereClause: any = {};
    if (targetRole && targetRole !== 'ALL') whereClause.targetRole = targetRole;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        include: { offer: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum, take: limitNum
      }),
      prisma.notification.count({ where: whereClause })
    ]);

    return res.status(200).json({
      success: true, data: notifications,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ POST /api/admin/notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function createAdminNotification(req: AuthenticatedRequest, res: Response) {
  const { title, body, type, targetRole, targetUserId } = req.body;
  if (!title || !body || !targetRole) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title, body, and targetRole are required' } });
  }

  try {
    const notifType: NotificationType = (type as NotificationType) || NotificationType.SYSTEM;
    const target: NotificationTargetRole = targetRole as NotificationTargetRole;

    if (target === NotificationTargetRole.CUSTOMER_ONLY || target === NotificationTargetRole.ALL) {
      if (targetUserId) {
        // Single customer
        const customer = await prisma.customer.findFirst({ where: { userId: targetUserId } });
        if (customer) {
          await prisma.notification.create({ data: { customerId: customer.id, title, body, type: notifType, targetRole: target } });
        }
      } else {
        // All customers
        const customers = await prisma.customer.findMany({ where: { isSuspended: false }, select: { id: true, userId: true, user: { select: { fcmToken: true } } } });
        for (const c of customers) {
          await prisma.notification.create({ data: { customerId: c.id, title, body, type: notifType, targetRole: target } });
          emitToUser(c.userId, 'new_notification', { title, body });
        }
      }
    }

    if (target === NotificationTargetRole.DRIVER_ONLY || target === NotificationTargetRole.ALL) {
      if (targetUserId) {
        const driver = await prisma.driver.findFirst({ where: { userId: targetUserId } });
        if (driver) {
          await prisma.driverNotification.create({ data: { driverId: driver.id, title, body, type: notifType } });
          emitToUser(targetUserId, 'new_notification', { title, body });
        }
      } else {
        const drivers = await prisma.driver.findMany({ where: { isSuspended: false }, select: { id: true, userId: true } });
        for (const d of drivers) {
          await prisma.driverNotification.create({ data: { driverId: d.id, title, body, type: notifType } });
          emitToUser(d.userId, 'new_notification', { title, body });
        }
      }
    }

    await writeAuditLog(req.user!.id, AuditAction.NOTIFICATION_SENT, 'Notification', undefined, { title, targetRole });

    return res.status(201).json({ success: true, data: { message: 'Notification sent successfully' } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ GET /api/admin/offers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getOffers(req: AuthenticatedRequest, res: Response) {
  try {
    const offers = await prisma.offer.findMany({ orderBy: { createdAt: 'desc' } });
    return res.status(200).json({ success: true, data: offers });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ POST /api/admin/offers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function createOffer(req: AuthenticatedRequest, res: Response) {
  const { title, description, discountValue, couponCode, startDate, endDate, isActive } = req.body;
  if (!title || !description || !startDate || !endDate) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title, description, startDate, endDate are required' } });
  }

  try {
    const offer = await prisma.offer.create({
      data: {
        title, description,
        discountValue: parseFloat(discountValue || '0'),
        couponCode: couponCode || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive !== false
      }
    });

    // Send notification to all active customers
    const customers = await prisma.customer.findMany({ where: { isSuspended: false }, select: { id: true, userId: true } });
    for (const c of customers) {
      await prisma.notification.create({
        data: { customerId: c.id, title: `ðŸŽ ${title}`, body: description, type: NotificationType.OFFER, targetRole: NotificationTargetRole.CUSTOMER_ONLY, offerId: offer.id }
      });
      emitToUser(c.userId, 'new_notification', { title: `ðŸŽ ${title}`, body: description, type: 'OFFER' });
    }

    await writeAuditLog(req.user!.id, AuditAction.OFFER_CREATED, 'Offer', offer.id, { title });

    return res.status(201).json({ success: true, data: offer });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ PUT /api/admin/offers/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function updateOffer(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { title, description, discountValue, couponCode, startDate, endDate, isActive } = req.body;
  try {
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (discountValue !== undefined) data.discountValue = parseFloat(discountValue);
    if (couponCode !== undefined) data.couponCode = couponCode;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = new Date(endDate);
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await prisma.offer.update({ where: { id }, data });
    await writeAuditLog(req.user!.id, AuditAction.OFFER_UPDATED, 'Offer', id, { title });
    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ DELETE /api/admin/offers/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function deleteOffer(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  try {
    await prisma.offer.delete({ where: { id } });
    return res.status(200).json({ success: true, data: { message: 'Offer deleted' } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ GET /api/admin/staff â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getStaff(req: AuthenticatedRequest, res: Response) {
  try {
    const staff = await prisma.adminStaff.findMany({
      include: { user: { select: { email: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ success: true, data: staff });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ POST /api/admin/staff â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function createStaff(req: AuthenticatedRequest, res: Response) {
  const { email, password, staffRole } = req.body;
  if (!email || !password || !staffRole) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'email, password, and staffRole are required' } });
  }

  if (!Object.values(StaffRole).includes(staffRole)) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid staffRole' } });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ success: false, error: { code: 'DUPLICATE_EMAIL', message: 'Email already exists' } });

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await prisma.user.create({
      data: { email, password: hashedPassword, role: UserRole.ADMIN }
    });

    const staff = await prisma.adminStaff.create({
      data: { userId: newUser.id, staffRole: staffRole as StaffRole, isActive: true },
      include: { user: { select: { email: true, createdAt: true } } }
    });

    await writeAuditLog(req.user!.id, AuditAction.STAFF_CREATED, 'AdminStaff', staff.id, { email, staffRole });

    return res.status(201).json({ success: true, data: staff });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ PUT /api/admin/staff/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function updateStaff(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { staffRole, isActive } = req.body;
  try {
    const data: any = {};
    if (staffRole !== undefined) data.staffRole = staffRole;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await prisma.adminStaff.update({
      where: { id }, data,
      include: { user: { select: { email: true } } }
    });

    await writeAuditLog(req.user!.id, AuditAction.STAFF_UPDATED, 'AdminStaff', id, { staffRole, isActive });
    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ GET /api/admin/audit-logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getAuditLogs(req: AuthenticatedRequest, res: Response) {
  const { page = '1', limit = '30', action } = req.query;
  try {
    const whereClause: any = {};
    if (action) whereClause.action = action;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        include: { actor: { include: { user: { select: { email: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum, take: limitNum
      }),
      prisma.auditLog.count({ where: whereClause })
    ]);

    return res.status(200).json({ success: true, data: logs, meta: { total, page: pageNum, limit: limitNum } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ GET /api/admin/settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const settings = await prisma.appSetting.findMany();
    const settingsMap: Record<string, string> = {};
    settings.forEach(s => { settingsMap[s.key] = s.value; });
    return res.status(200).json({ success: true, data: settingsMap });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

// â”€â”€â”€ PUT /api/admin/settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function updateSettings(req: AuthenticatedRequest, res: Response) {
  const { settings } = req.body; // { key: value, ... }
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'settings object is required' } });
  }

  // Blocked keys (security)
  const BLOCKED_KEYS = ['JWT_SECRET', 'STRIPE_SECRET_KEY', 'DATABASE_URL', 'FIREBASE_PRIVATE_KEY'];

  try {
    const updates: any[] = [];
    for (const [key, value] of Object.entries(settings)) {
      if (BLOCKED_KEYS.includes(key)) continue;
      updates.push(
        prisma.appSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) }
        })
      );
    }
    await Promise.all(updates);

    await writeAuditLog(req.user!.id, AuditAction.SETTING_UPDATED, 'AppSetting', undefined, { keys: Object.keys(settings) });

    const all = await prisma.appSetting.findMany();
    const settingsMap: Record<string, string> = {};
    all.forEach(s => { settingsMap[s.key] = s.value; });

    return res.status(200).json({ success: true, data: settingsMap });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}
