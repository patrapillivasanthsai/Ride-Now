import { Response } from 'express';
import { PrismaClient, RideStatus, UserRole } from '@prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const prisma = new PrismaClient();

/**
 * POST /api/customer/rides/:id/rating
 */
export async function submitCustomerRating(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { id } = req.params;
  const { score, comment } = req.body;

  const scoreVal = parseInt(score, 10);
  if (isNaN(scoreVal) || scoreVal < 1 || scoreVal > 5) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Score must be an integer between 1 and 5' }
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

    const ride = await prisma.ride.findUnique({
      where: { id }
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: { code: 'RIDE_NOT_FOUND', message: 'Ride record not found' }
      });
    }

    // Ownership check
    if (ride.customerId !== customer.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: You do not own this ride request' }
      });
    }

    // Status guard
    if (ride.status !== RideStatus.RIDE_COMPLETED) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Can only submit ratings for completed rides' }
      });
    }

    if (!ride.driverId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Ride has no driver assigned to be rated' }
      });
    }

    // Duplicate rating check
    const existing = await prisma.rating.findFirst({
      where: {
        rideId: id,
        raterRole: UserRole.CUSTOMER
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_RATING', message: 'You have already rated this ride' }
      });
    }

    const rating = await prisma.rating.create({
      data: {
        rideId: id,
        score: scoreVal,
        comment: comment || null,
        raterRole: UserRole.CUSTOMER,
        customerId: customer.id,
        driverId: ride.driverId
      }
    });

    return res.status(201).json({
      success: true,
      data: rating
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to submit rating' }
    });
  }
}

/**
 * POST /api/driver/rides/:id/rating
 */
export async function submitDriverRating(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { id } = req.params;
  const { score, comment } = req.body;

  const scoreVal = parseInt(score, 10);
  if (isNaN(scoreVal) || scoreVal < 1 || scoreVal > 5) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Score must be an integer between 1 and 5' }
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

    const ride = await prisma.ride.findUnique({
      where: { id }
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: { code: 'RIDE_NOT_FOUND', message: 'Ride record not found' }
      });
    }

    // Ownership check
    if (ride.driverId !== driver.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: You are not the driver assigned to this ride' }
      });
    }

    // Status guard
    if (ride.status !== RideStatus.RIDE_COMPLETED) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Can only submit ratings for completed rides' }
      });
    }

    // Duplicate rating check
    const existing = await prisma.rating.findFirst({
      where: {
        rideId: id,
        raterRole: UserRole.DRIVER
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_RATING', message: 'You have already rated this ride' }
      });
    }

    const rating = await prisma.rating.create({
      data: {
        rideId: id,
        score: scoreVal,
        comment: comment || null,
        raterRole: UserRole.DRIVER,
        customerId: ride.customerId,
        driverId: driver.id
      }
    });

    return res.status(201).json({
      success: true,
      data: rating
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to submit rating' }
    });
  }
}
