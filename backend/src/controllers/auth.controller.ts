import { Response } from 'express';
import { PrismaClient, UserRole, DriverStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
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
 * Helper to validate basic authentication input values.
 */
function validateAuthInput(email?: string, password?: string) {
  if (!email || !EMAIL_REGEX.test(email)) {
    return 'Please provide a valid email address';
  }
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters long';
  }
  return null;
}

/**
 * POST /api/auth/register/customer
 */
export async function registerCustomer(req: AuthenticatedRequest, res: Response) {
  const { email, password, phone, name } = req.body;

  const validationError = validateAuthInput(email, password);
  if (validationError) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: validationError }
    });
  }

  try {
    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_ALREADY_EXISTS', message: 'This email is already registered' }
      });
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Create User and linked Customer profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: UserRole.CUSTOMER,
          customer: {
            create: {
              phone,
            }
          }
        },
        include: {
          customer: true
        }
      });
      return user;
    });

    return res.status(201).json({
      success: true,
      data: {
        id: result.id,
        email: result.email,
        role: result.role,
        customerProfile: {
          id: result.customer?.id,
          phone: result.customer?.phone
        },
        createdAt: result.createdAt
      }
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Customer registration failed' }
    });
  }
}

/**
 * POST /api/auth/register/driver
 */
export async function registerDriver(req: AuthenticatedRequest, res: Response) {
  const { email, password, phone, name, licenseNumber, vehicle } = req.body;

  const validationError = validateAuthInput(email, password);
  if (validationError) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: validationError }
    });
  }

  // Basic vehicle inputs check
  if (!vehicle || !vehicle.make || !vehicle.model || !vehicle.year || !vehicle.plateNumber) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Vehicle details (make, model, year, plateNumber) are required' }
    });
  }

  if (licenseNumber !== undefined && licenseNumber !== null) {
    if (!validateDrivingLicense(licenseNumber)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid driving license format' }
      });
    }
  }

  try {
    const normalizedPhone = phone ? normalizeIndianPhoneNumber(phone) : phone;
    const normalizedPlate = normalizeIndianPlateNumber(vehicle.plateNumber);

    // Check uniqueness
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_ALREADY_EXISTS', message: 'This email is already registered' }
      });
    }

    const existingVehicle = await prisma.vehicle.findUnique({ where: { plateNumber: normalizedPlate } });
    if (existingVehicle) {
      return res.status(409).json({
        success: false,
        error: { code: 'PLATE_NUMBER_ALREADY_EXISTS', message: 'This vehicle plate number is already registered' }
      });
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Create User, Driver, Vehicle, and Location in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: UserRole.DRIVER,
          driver: {
            create: {
              name: name || null,
              licenseNumber: licenseNumber || null,
              phone: normalizedPhone,
              isApproved: false, // Default is false, needs admin approval later
              status: DriverStatus.OFFLINE,
              vehicle: {
                create: {
                  make: vehicle.make,
                  model: vehicle.model,
                  year: parseInt(vehicle.year),
                  color: vehicle.color || 'Unknown',
                  plateNumber: normalizedPlate,
                  type: vehicle.type ? mapUserFacingToDbVehicleType(vehicle.type) : 'CAB'
                }
              },
              driverLocation: {
                create: {
                  lat: 0.0,
                  lng: 0.0
                }
              }
            }
          }
        },
        include: {
          driver: {
            include: {
              vehicle: true
            }
          }
        }
      });
      return user;
    });

    return res.status(201).json({
      success: true,
      data: {
        id: result.id,
        email: result.email,
        role: result.role,
        driverProfile: {
          id: result.driver?.id,
          name: result.driver?.name,
          licenseNumber: result.driver?.licenseNumber,
          phone: result.driver?.phone,
          isApproved: result.driver?.isApproved,
          status: result.driver?.status,
          vehicle: result.driver?.vehicle ? {
            ...result.driver.vehicle,
            type: mapDbToUserFacingVehicleType(result.driver.vehicle.type)
          } : null
        },
        createdAt: result.createdAt
      }
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Driver registration failed' }
    });
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req: AuthenticatedRequest, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' }
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        customer: true,
        driver: {
          include: {
            vehicle: true
          }
        }
      }
    });

    // Mask security detail: do not show if user exists, use standard message
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    // Sign token
    const token = generateToken({ userId: user.id, role: user.role });

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          customerProfile: user.customer ? { id: user.customer.id, phone: user.customer.phone } : null,
          driverProfile: user.driver ? {
            id: user.driver.id,
            name: user.driver.name,
            licenseNumber: user.driver.licenseNumber,
            phone: user.driver.phone,
            isApproved: user.driver.isApproved,
            status: user.driver.status,
            vehicle: user.driver.vehicle ? {
              ...user.driver.vehicle,
              type: mapDbToUserFacingVehicleType(user.driver.vehicle.type)
            } : null
          } : null
        },
        token
      }
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Login failed' }
    });
  }
}

/**
 * GET /api/auth/me
 */
export async function getMe(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        customer: {
          select: { id: true, phone: true }
        },
        driver: {
          select: {
            id: true,
            name: true,
            licenseNumber: true,
            phone: true,
            isApproved: true,
            status: true,
            vehicle: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    const mappedUser = {
      ...user,
      driver: user.driver ? {
        ...user.driver,
        vehicle: user.driver.vehicle ? {
          ...user.driver.vehicle,
          type: mapDbToUserFacingVehicleType(user.driver.vehicle.type)
        } : null
      } : null
    };

    return res.status(200).json({
      success: true,
      data: mappedUser
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to retrieve profile details' }
    });
  }
}

/**
 * POST /api/auth/fcm-token
 */
export async function updateFcmToken(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Device token is required' }
    });
  }

  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { fcmToken: token }
    });

    return res.status(200).json({
      success: true,
      message: 'FCM token updated successfully'
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update FCM token' }
    });
  }
}
