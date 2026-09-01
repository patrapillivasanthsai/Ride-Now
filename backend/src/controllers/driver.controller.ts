import { Response } from 'express';
import { PrismaClient, DriverStatus, VehicleType, UserRole, RideStatus, PaymentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { checkAndExpireRide } from './ride.controller';
import {
  normalizeIndianPhoneNumber,
  normalizeIndianPlateNumber,
  validateDrivingLicense,
  mapUserFacingToDbVehicleType,
  mapDbToUserFacingVehicleType
} from '../utils/validation';

const prisma = new PrismaClient();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/driver/profile
 */
export async function getProfile(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  try {
    const driver = await prisma.driver.findUnique({
      where: { userId: req.user.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true
          }
        },
        vehicle: true,
        driverLocation: true
      }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: { code: 'DRIVER_PROFILE_NOT_FOUND', message: 'Driver profile not found' }
      });
    }

    // Calculate rating metrics
    const aggregate = await prisma.rating.aggregate({
      where: {
        driverId: driver.id,
        raterRole: UserRole.CUSTOMER
      },
      _avg: { score: true },
      _count: { score: true }
    });

    const averageRating = aggregate._avg.score !== null ? parseFloat(aggregate._avg.score.toFixed(2)) : null;
    const totalRatings = aggregate._count.score;

    return res.status(200).json({
      success: true,
      data: {
        id: driver.id,
        userId: driver.userId,
        email: driver.user.email,
        name: driver.name,
        licenseNumber: driver.licenseNumber,
        phone: driver.phone,
        role: driver.user.role,
        isApproved: driver.isApproved,
        status: driver.status,
        vehicle: driver.vehicle ? {
          ...driver.vehicle,
          type: mapDbToUserFacingVehicleType(driver.vehicle.type)
        } : null,
        location: driver.driverLocation,
        createdAt: driver.user.createdAt,
        averageRating,
        totalRatings
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to retrieve profile' }
    });
  }
}

/**
 * PUT /api/driver/profile
 */
export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { email, password, phone, status, name, licenseNumber } = req.body;

  try {
    const driver = await prisma.driver.findUnique({
      where: { userId: req.user.id }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: { code: 'DRIVER_PROFILE_NOT_FOUND', message: 'Driver profile not found' }
      });
    }

    const userUpdateData: any = {};
    const driverUpdateData: any = {};

    if (email !== undefined) {
      if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Please provide a valid email address' }
        });
      }
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: req.user.id }
        }
      });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: { code: 'EMAIL_ALREADY_EXISTS', message: 'This email is already in use' }
        });
      }
      userUpdateData.email = email;
    }

    if (password !== undefined) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters long' }
        });
      }
      const salt = bcrypt.genSaltSync(10);
      userUpdateData.password = bcrypt.hashSync(password, salt);
    }

    if (phone !== undefined) {
      driverUpdateData.phone = phone ? normalizeIndianPhoneNumber(phone) : phone;
    }

    if (name !== undefined) {
      driverUpdateData.name = name;
    }

    if (licenseNumber !== undefined && licenseNumber !== null) {
      if (!validateDrivingLicense(licenseNumber)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid driving license format' }
        });
      }
      driverUpdateData.licenseNumber = licenseNumber;
    }

    if (status !== undefined) {
      if (!Object.values(DriverStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `Invalid status. Must be one of: ${Object.values(DriverStatus).join(', ')}` }
        });
      }
      driverUpdateData.status = status;
    }

    const updatedDriver = await prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: req.user!.id },
          data: userUpdateData
        });
      }
      const drv = await tx.driver.update({
        where: { id: driver.id },
        data: driverUpdateData,
        include: {
          user: {
            select: {
              email: true,
              role: true,
              updatedAt: true
            }
          }
        }
      });
      // Track Online/Offline Duty Sessions
      if (status !== undefined && status !== driver.status) {
        if (status === DriverStatus.ONLINE) {
          const activeSession = await tx.driverDutySession.findFirst({
            where: { driverId: driver.id, endTime: null }
          });
          if (!activeSession) {
            await tx.driverDutySession.create({
              data: {
                driverId: driver.id,
                startTime: new Date()
              }
            });
          }
        } else if (status === DriverStatus.OFFLINE) {
          const activeSessions = await tx.driverDutySession.findMany({
            where: { driverId: driver.id, endTime: null }
          });
          const nowTime = new Date();
          for (const s of activeSessions) {
            const dur = Math.max(0, Math.round((nowTime.getTime() - new Date(s.startTime).getTime()) / 1000));
            await tx.driverDutySession.update({
              where: { id: s.id },
              data: {
                endTime: nowTime,
                durationSeconds: dur
              }
            });
          }
        }
      }

      return drv;
    });

    return res.status(200).json({
      success: true,
      data: {
        id: updatedDriver.id,
        userId: updatedDriver.userId,
        email: updatedDriver.user.email,
        name: updatedDriver.name,
        licenseNumber: updatedDriver.licenseNumber,
        phone: updatedDriver.phone,
        role: updatedDriver.user.role,
        isApproved: updatedDriver.isApproved,
        status: updatedDriver.status,
        updatedAt: updatedDriver.user.updatedAt
      }
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update profile' }
    });
  }
}

/**
 * PUT /api/driver/vehicle
 */
export async function updateVehicle(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { make, model, year, color, plateNumber, type } = req.body;

  try {
    const driver = await prisma.driver.findUnique({
      where: { userId: req.user.id },
      include: { vehicle: true }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: { code: 'DRIVER_PROFILE_NOT_FOUND', message: 'Driver profile not found' }
      });
    }

    let normalizedPlate: string | undefined;
    if (plateNumber !== undefined) {
      normalizedPlate = normalizeIndianPlateNumber(plateNumber);
      const existingVehicle = await prisma.vehicle.findFirst({
        where: {
          plateNumber: normalizedPlate,
          NOT: { driverId: driver.id }
        }
      });
      if (existingVehicle) {
        return res.status(409).json({
          success: false,
          error: { code: 'PLATE_NUMBER_ALREADY_EXISTS', message: 'This vehicle plate number is already registered' }
        });
      }
    }

    let dbType: VehicleType | undefined;
    if (type !== undefined) {
      if (Object.values(VehicleType).includes(type)) {
        dbType = type as VehicleType;
      } else if (['car', 'bike', 'auto'].includes(type.trim().toLowerCase())) {
        dbType = mapUserFacingToDbVehicleType(type);
      } else {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `Invalid vehicle type. Must be one of: Car, Bike, Auto or database enum values` }
        });
      }
    }

    const updatedVehicle = await prisma.vehicle.upsert({
      where: { driverId: driver.id },
      update: {
        make,
        model,
        year: year ? parseInt(year) : undefined,
        color,
        plateNumber: normalizedPlate,
        type: dbType
      },
      create: {
        driverId: driver.id,
        make: make || 'Unknown',
        model: model || 'Unknown',
        year: year ? parseInt(year) : new Date().getFullYear(),
        color: color || 'Unknown',
        plateNumber: normalizedPlate || `TEMP-${Date.now()}`,
        type: dbType || VehicleType.CAB
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        ...updatedVehicle,
        type: mapDbToUserFacingVehicleType(updatedVehicle.type)
      }
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update vehicle' }
    });
  }
}

/**
 * PUT /api/driver/location
 */
export async function updateLocation(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { lat, lng } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Latitude (lat) and longitude (lng) are required' }
    });
  }

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);

  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Latitude and longitude must be valid numbers' }
    });
  }

  try {
    const driver = await prisma.driver.findUnique({
      where: { userId: req.user.id }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: { code: 'DRIVER_PROFILE_NOT_FOUND', message: 'Driver profile not found' }
      });
    }

    const updatedLocation = await prisma.driverLocation.upsert({
      where: { driverId: driver.id },
      update: {
        lat: parsedLat,
        lng: parsedLng
      },
      create: {
        driverId: driver.id,
        lat: parsedLat,
        lng: parsedLng
      }
    });

    return res.status(200).json({
      success: true,
      data: updatedLocation
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update location' }
    });
  }
}

/**
 * GET /api/driver/rides
 */
export async function getRides(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  try {
    const driver = await prisma.driver.findUnique({
      where: { userId: req.user.id }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: { code: 'DRIVER_PROFILE_NOT_FOUND', message: 'Driver profile not found' }
      });
    }

    const rides = await prisma.ride.findMany({
      where: { driverId: driver.id },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            phone: true,
            user: { select: { email: true } }
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: rides
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to retrieve rides' }
    });
  }
}

/**
 * GET /api/driver/rides/:id
 */
export async function getRideDetail(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { id } = req.params;

  try {
    await checkAndExpireRide(id);
    const driver = await prisma.driver.findUnique({
      where: { userId: req.user.id }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: { code: 'DRIVER_PROFILE_NOT_FOUND', message: 'Driver profile not found' }
      });
    }

    const ride = await prisma.ride.findUnique({
      where: { id },
      include: {
        statusHistory: {
          orderBy: { createdAt: 'asc' }
        },
        payments: true,
        ratings: true,
        customer: {
          select: {
            id: true,
            phone: true,
            user: { select: { email: true } }
          }
        }
      }
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' }
      });
    }

    // Ownership check: ensure only the assigned driver can view the ride details
    if (ride.driverId !== driver.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: You are not authorized to view this ride' }
      });
    }

    return res.status(200).json({
      success: true,
      data: ride
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to retrieve ride details' }
    });
  }
}

/**
 * GET /api/driver/earnings
 */
export async function getEarnings(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  try {
    const driver = await prisma.driver.findUnique({
      where: { userId: req.user.id }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: { code: 'DRIVER_PROFILE_NOT_FOUND', message: 'Driver profile not found' }
      });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = now.getDay();
    const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const mondayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const completedRides = await prisma.ride.findMany({
      where: {
        driverId: driver.id,
        status: RideStatus.RIDE_COMPLETED
      },
      select: {
        id: true,
        createdAt: true,
        pickupAddress: true,
        dropoffAddress: true,
        fare: true,
        vehicleType: true,
        status: true,
        distance: true,
        duration: true
      },
      orderBy: { createdAt: 'desc' }
    });

    let dailyEarnings = 0;
    let dailyTrips = 0;

    let weeklyEarnings = 0;
    let weeklyTrips = 0;

    let monthlyEarnings = 0;
    let monthlyTrips = 0;

    let totalEarnings = 0;
    let totalTrips = completedRides.length;

    const commissionRate = 0.80; // 80% driver share

    const history = completedRides.map((ride) => {
      const driverShare = parseFloat(((ride.fare || 0) * commissionRate).toFixed(2));
      totalEarnings += driverShare;

      const rideDate = new Date(ride.createdAt);
      if (rideDate >= todayStart) {
        dailyEarnings += driverShare;
        dailyTrips += 1;
      }
      if (rideDate >= mondayStart) {
        weeklyEarnings += driverShare;
        weeklyTrips += 1;
      }
      if (rideDate >= monthStart) {
        monthlyEarnings += driverShare;
        monthlyTrips += 1;
      }

      return {
        id: ride.id,
        createdAt: ride.createdAt,
        pickupAddress: ride.pickupAddress,
        dropoffAddress: ride.dropoffAddress,
        fare: ride.fare,
        driverShare,
        vehicleType: ride.vehicleType,
        status: ride.status,
        distance: ride.distance,
        duration: ride.duration
      };
    });

    dailyEarnings = parseFloat(dailyEarnings.toFixed(2));
    weeklyEarnings = parseFloat(weeklyEarnings.toFixed(2));
    monthlyEarnings = parseFloat(monthlyEarnings.toFixed(2));
    totalEarnings = parseFloat(totalEarnings.toFixed(2));

    const dailyAvgPerTrip = dailyTrips > 0 ? parseFloat((dailyEarnings / dailyTrips).toFixed(2)) : 0;
    const weeklyAvgPerTrip = weeklyTrips > 0 ? parseFloat((weeklyEarnings / weeklyTrips).toFixed(2)) : 0;
    const monthlyAvgPerTrip = monthlyTrips > 0 ? parseFloat((monthlyEarnings / monthlyTrips).toFixed(2)) : 0;
    const averagePerTrip = totalTrips > 0 ? parseFloat((totalEarnings / totalTrips).toFixed(2)) : 0;

    // Real Online Duty Time Calculation
    const sessions = await prisma.driverDutySession.findMany({
      where: { driverId: driver.id }
    });

    let todayOnlineSecs = 0;
    let weeklyOnlineSecs = 0;
    let monthlyOnlineSecs = 0;

    const formatDuty = (sec: number) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return `${h}h ${m < 10 ? '0' : ''}${m}m`;
    };

    sessions.forEach(s => {
      let dur = s.durationSeconds || 0;
      if (!s.endTime) {
        dur = Math.max(0, Math.round((now.getTime() - new Date(s.startTime).getTime()) / 1000));
      }
      const sTime = new Date(s.startTime);
      if (sTime >= todayStart) todayOnlineSecs += dur;
      if (sTime >= mondayStart) weeklyOnlineSecs += dur;
      if (sTime >= monthStart) monthlyOnlineSecs += dur;
    });

    return res.status(200).json({
      success: true,
      data: {
        dailyEarnings,
        dailyTrips,
        dailyAvgPerTrip,
        todayEarnings: dailyEarnings,
        todayTrips: dailyTrips,
        todayAvgPerTrip: dailyAvgPerTrip,
        todayOnlineTime: formatDuty(todayOnlineSecs),

        weeklyEarnings,
        weeklyTrips,
        weeklyAvgPerTrip,
        weeklyOnlineTime: formatDuty(weeklyOnlineSecs),

        monthlyEarnings,
        monthlyTrips,
        monthlyAvgPerTrip,
        monthlyOnlineTime: formatDuty(monthlyOnlineSecs),

        totalEarnings,
        totalTrips,
        completedTrips: totalTrips,
        averagePerTrip,
        commissionRate,
        history
      }
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to retrieve earnings summary' }
    });
  }
}
