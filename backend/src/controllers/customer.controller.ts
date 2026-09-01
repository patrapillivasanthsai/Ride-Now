import { Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { checkAndExpireRide } from './ride.controller';

const prisma = new PrismaClient();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/customer/profile
 */
export async function getProfile(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true
          }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'CUSTOMER_PROFILE_NOT_FOUND', message: 'Customer profile not found' }
      });
    }

    // Calculate rating metrics
    const aggregate = await prisma.rating.aggregate({
      where: {
        customerId: customer.id,
        raterRole: UserRole.DRIVER
      },
      _avg: { score: true },
      _count: { score: true }
    });

    const averageRating = aggregate._avg.score !== null ? parseFloat(aggregate._avg.score.toFixed(2)) : null;
    const totalRatings = aggregate._count.score;

    return res.status(200).json({
      success: true,
      data: {
        id: customer.id,
        userId: customer.userId,
        email: customer.user.email,
        phone: customer.phone,
        name: customer.name,
        gender: customer.gender,
        dob: customer.dob,
        trustedContacts: customer.trustedContacts,
        defaultPaymentMethod: customer.defaultPaymentMethod,
        defaultUpiId: customer.defaultUpiId,
        role: customer.user.role,
        createdAt: customer.user.createdAt,
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
 * PUT /api/customer/profile
 */
export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { email, password, phone, name, gender, dob, trustedContacts, defaultPaymentMethod, defaultUpiId } = req.body;

  try {
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user.id }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'CUSTOMER_PROFILE_NOT_FOUND', message: 'Customer profile not found' }
      });
    }

    // Prepare update structures
    const userUpdateData: any = {};
    const customerUpdateData: any = {};

    if (email !== undefined) {
      if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Please provide a valid email address' }
        });
      }
      // Check email uniqueness
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
      customerUpdateData.phone = phone;
    }

    if (name !== undefined) {
      customerUpdateData.name = name ? name.trim() : null;
    }

    if (gender !== undefined) {
      if (gender && !['Male', 'Female', 'Other', 'Prefer not to say'].includes(gender)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid gender value' }
        });
      }
      customerUpdateData.gender = gender || null;
    }

    if (dob !== undefined) {
      if (dob) {
        const parsedDate = new Date(dob);
        if (isNaN(parsedDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid date of birth' }
          });
        }
        customerUpdateData.dob = parsedDate;
      } else {
        customerUpdateData.dob = null;
      }
    }

    if (trustedContacts !== undefined) {
      if (trustedContacts !== null) {
        if (!Array.isArray(trustedContacts)) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Trusted contacts must be an array' }
          });
        }
        for (const contact of trustedContacts) {
          if (!contact.name || typeof contact.name !== 'string' || !contact.phone || typeof contact.phone !== 'string') {
            return res.status(400).json({
              success: false,
              error: { code: 'VALIDATION_ERROR', message: 'Each contact must have a name and phone number' }
            });
          }
        }
      }
      customerUpdateData.trustedContacts = trustedContacts;
    }

    if (defaultPaymentMethod !== undefined) {
      if (!['CARD', 'UPI', 'CASH'].includes(defaultPaymentMethod)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid default payment method' }
        });
      }
      customerUpdateData.defaultPaymentMethod = defaultPaymentMethod;
    }

    if (defaultUpiId !== undefined) {
      customerUpdateData.defaultUpiId = defaultUpiId || null;
    }

    // Run transaction update
    const updatedCustomer = await prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: req.user!.id },
          data: userUpdateData
        });
      }
      const cust = await tx.customer.update({
        where: { id: customer.id },
        data: customerUpdateData,
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
      return cust;
    });

    return res.status(200).json({
      success: true,
      data: {
        id: updatedCustomer.id,
        userId: updatedCustomer.userId,
        email: updatedCustomer.user.email,
        phone: updatedCustomer.phone,
        name: updatedCustomer.name,
        gender: updatedCustomer.gender,
        dob: updatedCustomer.dob,
        trustedContacts: updatedCustomer.trustedContacts,
        defaultPaymentMethod: updatedCustomer.defaultPaymentMethod,
        defaultUpiId: updatedCustomer.defaultUpiId,
        role: updatedCustomer.user.role,
        updatedAt: updatedCustomer.user.updatedAt
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
 * GET /api/customer/rides
 */
export async function getRideHistory(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user.id }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'CUSTOMER_PROFILE_NOT_FOUND', message: 'Customer profile not found' }
      });
    }

    const rides = await prisma.ride.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      include: {
        driver: {
          select: {
            id: true,
            phone: true,
            vehicle: true,
            user: {
              select: { email: true }
            }
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
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to retrieve ride history' }
    });
  }
}

/**
 * GET /api/customer/rides/:id
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
    const customer = await prisma.customer.findUnique({
      where: { userId: req.user.id }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'CUSTOMER_PROFILE_NOT_FOUND', message: 'Customer profile not found' }
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
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicle: true,
            driverLocation: true,
            user: {
              select: { email: true }
            }
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

    // Ownership check: ensure only the customer who booked it can view it
    if (ride.customerId !== customer.id) {
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
