import { Request, Response } from 'express';
import { PrismaClient, RideStatus, VehicleType, UserRole, PaymentStatus, PaymentMethod } from '@prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { emitToRide, emitToRole } from '../socket';
import { sendPushNotification } from '../utils/firebase';
import { stripe } from '../utils/stripe';
import { PaymentService } from '../services/payment.service';
import { DispatchService } from '../services/dispatch.service';

const prisma = new PrismaClient();

// Helper: deg2rad
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Helper: Calculate Haversine straight-line distance in kilometers
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Valid transitions configuration map
 */
const VALID_TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  [RideStatus.REQUESTED]: [RideStatus.SEARCHING_DRIVER, RideStatus.CANCELLED],
  [RideStatus.SEARCHING_DRIVER]: [RideStatus.DRIVER_ASSIGNED, RideStatus.CANCELLED, RideStatus.NO_DRIVER_AVAILABLE],
  [RideStatus.DRIVER_ASSIGNED]: [RideStatus.DRIVER_ARRIVING, RideStatus.CANCELLED],
  [RideStatus.DRIVER_ARRIVING]: [RideStatus.DRIVER_ARRIVED, RideStatus.CANCELLED],
  [RideStatus.DRIVER_ARRIVED]: [RideStatus.RIDE_STARTED, RideStatus.CANCELLED],
  [RideStatus.RIDE_STARTED]: [RideStatus.RIDE_COMPLETED],
  [RideStatus.RIDE_COMPLETED]: [],
  [RideStatus.CANCELLED]: [],
  [RideStatus.NO_DRIVER_AVAILABLE]: []
};

/**
 * POST /api/customer/rides/estimate
 */
export async function getEstimate(req: Request, res: Response) {
  const { pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType } = req.body;

  if (pickupLat === undefined || pickupLng === undefined || dropoffLat === undefined || dropoffLng === undefined || !vehicleType) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'All coordinate parameters and vehicle type are required' }
    });
  }

  const pLat = parseFloat(pickupLat);
  const pLng = parseFloat(pickupLng);
  const dLat = parseFloat(dropoffLat);
  const dLng = parseFloat(dropoffLng);

  if (isNaN(pLat) || isNaN(pLng) || isNaN(dLat) || isNaN(dLng)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Coordinates must be valid numbers' }
    });
  }

  // Validate bounds
  if (pLat < -90 || pLat > 90 || pLng < -180 || pLng > 180 || dLat < -90 || dLat > 90 || dLng < -180 || dLng > 180) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Coordinates out of range (-90 to 90 for lat, -180 to 180 for lng)' }
    });
  }

  if (!Object.values(VehicleType).includes(vehicleType)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `Invalid vehicle type. Must be one of: ${Object.values(VehicleType).join(', ')}` }
    });
  }

  try {
    const pricing = await prisma.pricing.findUnique({
      where: { vehicleType }
    });

    if (!pricing) {
      return res.status(404).json({
        success: false,
        error: { code: 'PRICING_NOT_FOUND', message: `No pricing model set up for vehicle type ${vehicleType}` }
      });
    }

    const distance = calculateDistance(pLat, pLng, dLat, dLng);
    // Estimate travel duration using average speed of 30 km/h: (distance / 30) * 60 minutes
    const duration = (distance / 30.0) * 60.0;

    const baseFare = pricing.baseFare;
    const distanceFare = distance * pricing.perKmRate;
    const timeFare = duration * pricing.perMinuteRate;
    const totalFare = baseFare + distanceFare + timeFare;

    return res.status(200).json({
      success: true,
      data: {
        vehicleType,
        distance,
        duration,
        baseFare,
        distanceFare,
        timeFare,
        totalFare
      }
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to estimate fare' }
    });
  }
}

/**
 * POST /api/customer/rides
 */
export async function createRide(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { pickupAddress, pickupLat, pickupLng, dropoffAddress, dropoffLat, dropoffLng, vehicleType, paymentMethodId } = req.body;

  if (!pickupAddress || pickupLat === undefined || pickupLng === undefined || !dropoffAddress || dropoffLat === undefined || dropoffLng === undefined || !vehicleType || !paymentMethodId) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'All parameters (addresses, coordinates, vehicle type, paymentMethodId) are required' }
    });
  }

  const pLat = parseFloat(pickupLat);
  const pLng = parseFloat(pickupLng);
  const dLat = parseFloat(dropoffLat);
  const dLng = parseFloat(dropoffLng);

  if (isNaN(pLat) || isNaN(pLng) || isNaN(dLat) || isNaN(dLng)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Coordinates must be valid numbers' }
    });
  }

  if (pLat < -90 || pLat > 90 || pLng < -180 || pLng > 180 || dLat < -90 || dLat > 90 || dLng < -180 || dLng > 180) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Coordinates out of range (-90 to 90 for lat, -180 to 180 for lng)' }
    });
  }

  if (!Object.values(VehicleType).includes(vehicleType)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `Invalid vehicle type. Must be one of: ${Object.values(VehicleType).join(', ')}` }
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

    // Retrieve or Create Stripe Customer
    let stripeCustomerId = customer.stripeCustomerId;
    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: req.user.email,
        metadata: { userId: req.user.id, customerId: customer.id }
      });
      stripeCustomerId = stripeCustomer.id;
      await prisma.customer.update({
        where: { id: customer.id },
        data: { stripeCustomerId }
      });
    }

    // Query Pricing (do not trust frontend-supplied fares)
    const pricing = await prisma.pricing.findUnique({
      where: { vehicleType }
    });

    if (!pricing) {
      return res.status(404).json({
        success: false,
        error: { code: 'PRICING_NOT_FOUND', message: `Pricing configurations not found for ${vehicleType}` }
      });
    }

    const distance = calculateDistance(pLat, pLng, dLat, dLng);
    const duration = (distance / 30.0) * 60.0;

    const baseFare = pricing.baseFare;
    const distanceFare = distance * pricing.perKmRate;
    const timeFare = duration * pricing.perMinuteRate;
    const totalFare = baseFare + distanceFare + timeFare;

    let isAuthorized = false;
    let initialStatus: RideStatus = RideStatus.REQUESTED;
    let initialPayStatus: PaymentStatus = PaymentStatus.PENDING;
    let paymentProvider = 'STRIPE';
    let transactionId: string | null = null;
    let paymentIntent: any = null;

    if (paymentMethodId === 'CASH') {
      isAuthorized = true;
      initialStatus = RideStatus.SEARCHING_DRIVER;
      initialPayStatus = PaymentStatus.PENDING;
      paymentProvider = 'CASH';
    } else if (paymentMethodId === 'UPI' || paymentMethodId.startsWith('upi:')) {
      isAuthorized = true;
      initialStatus = RideStatus.SEARCHING_DRIVER;
      initialPayStatus = PaymentStatus.PENDING;
      paymentProvider = 'UPI';
      transactionId = 'upi_mock_' + Math.random().toString(36).substring(2, 11);
    } else {
      // Create payment intent on Stripe using pre-auth (capture_method: manual)
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalFare * 100), // paisa/cents
        currency: 'inr',
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        capture_method: 'manual',
        confirm: true,
        off_session: false,
        return_url: 'http://localhost:3000/api/customer/payments/confirm'
      });

      isAuthorized = paymentIntent.status === 'requires_capture';
      initialStatus = isAuthorized ? RideStatus.SEARCHING_DRIVER : RideStatus.REQUESTED;
      initialPayStatus = isAuthorized ? PaymentStatus.AUTHORIZED : PaymentStatus.PENDING;
      paymentProvider = 'STRIPE';
      transactionId = paymentIntent.id;
    }

    // Generate random 4-digit numeric start OTP (0000 - 9999)
    const generatedOtp = String(Math.floor(1000 + Math.random() * 9000));

    // Atomic transaction for Ride creation and RideStatusHistory logging
    const newRide = await prisma.$transaction(async (tx) => {
      const ride = await tx.ride.create({
        data: {
          customerId: customer.id,
          pickupAddress,
          pickupLat: pLat,
          pickupLng: pLng,
          dropoffAddress,
          dropoffLat: dLat,
          dropoffLng: dLng,
          fare: totalFare,
          vehicleType,
          distance,
          duration,
          baseFare,
          distanceFare,
          timeFare,
          status: initialStatus,
          otp: generatedOtp
        }
      });

      await tx.rideStatusHistory.create({
        data: {
          rideId: ride.id,
          status: initialStatus
        }
      });

      let resolvedMethod: PaymentMethod = PaymentMethod.CARD;
      if (paymentMethodId === 'CASH') resolvedMethod = PaymentMethod.CASH;
      else if (paymentMethodId === 'UPI' || paymentMethodId.startsWith('upi:')) resolvedMethod = PaymentMethod.UPI;

      await tx.payment.create({
        data: {
          rideId: ride.id,
          amount: totalFare,
          provider: paymentProvider,
          paymentMethod: resolvedMethod,
          transactionId,
          status: initialPayStatus
        }
      });

      return ride;
    });

    // 📣 Print Start OTP prominently in terminal
    console.log(`\n======================================================`);
    console.log(`🔐 [RIDENOW RIDE START OTP]`);
    console.log(`   Ride ID    : ${newRide.id}`);
    console.log(`   Passenger  : ${customer.name || customer.phone || 'Customer'}`);
    console.log(`   Vehicle    : ${vehicleType}`);
    console.log(`   👉 OTP CODE: >>> ${generatedOtp} <<<`);
    console.log(`======================================================\n`);

    if (isAuthorized) {
      // Automatically match and dispatch to eligible online drivers matching vehicle type
      DispatchService.dispatchRide(newRide.id).catch(err => {
        console.error('Auto-dispatch failed during ride creation:', err);
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        ...newRide,
        requiresAction: paymentIntent ? (paymentIntent.status === 'requires_action') : false,
        clientSecret: paymentIntent ? (paymentIntent.status === 'requires_action' ? paymentIntent.client_secret : null) : null
      }
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to request ride' }
    });
  }
}

/**
 * PATCH /api/customer/rides/:id/cancel
 */
export async function cancelRide(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { id } = req.params;

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
        error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' }
      });
    }

    // Ownership check
    if (ride.customerId !== customer.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: You do not own this ride request' }
      });
    }

    const currentStatus = ride.status;

    // Check transition validity
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(RideStatus.CANCELLED)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TRANSITION', message: `Cannot cancel ride from current status: ${currentStatus}` }
      });
    }

    // Atomic transaction for conditional update (concurrency protection) and status logging
    const cancelledRide = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.ride.updateMany({
        where: {
          id,
          status: currentStatus // Concurrency check: must match what we read
        },
        data: {
          status: RideStatus.CANCELLED
        }
      });

      if (updateResult.count === 0) {
        throw new Error('CONCURRENT_MODIFICATION_DETECTED');
      }

      await tx.rideStatusHistory.create({
        data: {
          rideId: id,
          status: RideStatus.CANCELLED
        }
      });

      return tx.ride.findUnique({ where: { id } });
    });

    if (cancelledRide) {
      emitToRide(id, 'ride_status_changed', { ride: cancelledRide });
      emitToRole(UserRole.DRIVER, 'available_ride_removed', { rideId: id });
      await notifyRideStatusChange(id, RideStatus.CANCELLED);

      // Fetch and cancel Stripe authorization hold
      try {
        await PaymentService.cancelPayment(id);
      } catch (err) {
        console.error('Failed to cancel Stripe hold for ride via PaymentService:', err);
      }
    }

    return res.status(200).json({
      success: true,
      data: cancelledRide
    });

  } catch (error: any) {
    if (error.message === 'CONCURRENT_MODIFICATION_DETECTED') {
      return res.status(409).json({
        success: false,
        error: { code: 'CONCURRENT_MODIFICATION', message: 'The ride state was updated by another request. Please reload.' }
      });
    }
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to cancel ride' }
    });
  }
}

/**
 * PATCH /api/driver/rides/:id/status
 */
export async function updateRideStatus(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Next status parameter is required' }
    });
  }

  if (!Object.values(RideStatus).includes(status)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `Invalid status code: ${status}` }
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
        error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' }
      });
    }

    // Special case for DRIVER_ASSIGNED: in later phases the matching system handles assignment.
    // However, to test transition or enable driver assignment testing, if a ride has no driver yet, 
    // we can allow a driver to self-assign if they move it from SEARCHING_DRIVER to DRIVER_ASSIGNED.
    // In other statuses, ownership check guarantees that only the assigned driver can update status.
    const currentStatus = ride.status;

    if (
      currentStatus !== RideStatus.REQUESTED &&
      currentStatus !== RideStatus.SEARCHING_DRIVER &&
      ride.driverId !== driver.id
    ) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: You are not assigned to this ride' }
      });
    }

    // Check transition validity
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TRANSITION', message: `Invalid transition from ${currentStatus} to ${status}` }
      });
    }

    // Enforce 4-digit Start OTP verification when driver starts the ride
    if (status === RideStatus.RIDE_STARTED) {
      const submittedOtp = req.body.otp !== undefined ? String(req.body.otp).trim() : '';
      const expectedOtp = ride.otp ? String(ride.otp).trim() : '1234';
      console.log(`\n🔍 [OTP Verification Check] Ride: ${id} | Received: "${submittedOtp}" | Required: "${expectedOtp}"`);
      if (!submittedOtp || submittedOtp !== expectedOtp) {
        console.log(`❌ [OTP Verification Failed] Incorrect code: "${submittedOtp}" != "${expectedOtp}"\n`);
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_OTP',
            message: 'Wrong OTP! Please verify the 4-digit Start OTP with the passenger.'
          }
        });
      }
      console.log(`✅ [OTP Verification Success] Match confirmed! Starting ride: ${id}\n`);
    }

    // Atomic transaction for conditional update and status logging
    const updatedRide = await prisma.$transaction(async (tx) => {
      const updateData: any = { status };
      
      // If accepting/assigning a SEARCHING_DRIVER ride, associate the driver ID
      if (currentStatus === RideStatus.SEARCHING_DRIVER && status === RideStatus.DRIVER_ASSIGNED) {
        updateData.driverId = driver.id;
      }

      const updateResult = await tx.ride.updateMany({
        where: {
          id,
          status: currentStatus // Concurrency check
        },
        data: updateData
      });

      if (updateResult.count === 0) {
        throw new Error('CONCURRENT_MODIFICATION_DETECTED');
      }

      await tx.rideStatusHistory.create({
        data: {
          rideId: id,
          status
        }
      });

      if (status === RideStatus.RIDE_COMPLETED) {
        await tx.driver.update({
          where: { id: driver.id },
          data: { status: 'ONLINE' }
        });
      }

      return tx.ride.findUnique({ where: { id } });
    });

    if (updatedRide) {
      emitToRide(id, 'ride_status_changed', { ride: updatedRide });
      if (status === RideStatus.DRIVER_ASSIGNED) {
        emitToRole(UserRole.DRIVER, 'available_ride_removed', { rideId: id });
      } else if (status === RideStatus.SEARCHING_DRIVER) {
        emitToRole(UserRole.DRIVER, 'available_ride_created', { ride: updatedRide });
      } else if (status === RideStatus.CANCELLED || status === RideStatus.NO_DRIVER_AVAILABLE) {
        emitToRole(UserRole.DRIVER, 'available_ride_removed', { rideId: id });
      }
      notifyRideStatusChange(id, status);

      // Handle hold capture on ride completion
      if (status === RideStatus.RIDE_COMPLETED) {
        try {
          await PaymentService.capturePayment(id);
        } catch (err) {
          console.error('Failed to capture Stripe hold on completion via PaymentService:', err);
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: updatedRide
    });

  } catch (error: any) {
    if (error.message === 'CONCURRENT_MODIFICATION_DETECTED') {
      return res.status(409).json({
        success: false,
        error: { code: 'CONCURRENT_MODIFICATION', message: 'The ride state was updated by another request. Please reload.' }
      });
    }
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update ride status' }
    });
  }
}

/**
 * Helper: Check if a SEARCHING_DRIVER or REQUESTED ride has expired (2 min timeout)
 * and atomically updates it to NO_DRIVER_AVAILABLE.
 */
export async function checkAndExpireRide(rideId: string): Promise<void> {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId }
  });

  if (ride && (ride.status === RideStatus.REQUESTED || ride.status === RideStatus.SEARCHING_DRIVER)) {
    const elapsedMs = Date.now() - new Date(ride.createdAt).getTime();
    const timeoutLimit = 2 * 60 * 1000; // 2 minutes

    if (elapsedMs > timeoutLimit) {
      const expiredRide = await prisma.$transaction(async (tx) => {
        const result = await tx.ride.updateMany({
          where: {
            id: rideId,
            status: { in: [RideStatus.REQUESTED, RideStatus.SEARCHING_DRIVER] }
          },
          data: {
            status: RideStatus.NO_DRIVER_AVAILABLE
          }
        });

        if (result.count > 0) {
          await tx.rideStatusHistory.create({
            data: {
              rideId,
              status: RideStatus.NO_DRIVER_AVAILABLE
            }
          });
          return tx.ride.findUnique({ where: { id: rideId } });
        }
        return null;
      });

      if (expiredRide) {
        emitToRide(rideId, 'ride_status_changed', { ride: expiredRide });
        emitToRole(UserRole.DRIVER, 'available_ride_removed', { rideId });
        await notifyRideStatusChange(rideId, RideStatus.NO_DRIVER_AVAILABLE);

        // Fetch and cancel Stripe authorization hold
        try {
          await PaymentService.cancelPayment(rideId);
        } catch (err) {
          console.error('Failed to cancel Stripe hold for expired ride via PaymentService:', err);
        }
      }
    }
  }
}

/**
 * GET /api/driver/rides/available
 */
export async function getAvailableRides(req: AuthenticatedRequest, res: Response) {
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

    if (driver.status !== 'ONLINE') {
      return res.status(400).json({
        success: false,
        error: { code: 'DRIVER_OFFLINE', message: 'Driver must be ONLINE to query matching rides' }
      });
    }

    if (!driver.isApproved) {
      return res.status(400).json({
        success: false,
        error: { code: 'DRIVER_UNAPPROVED', message: 'Driver account is pending approval' }
      });
    }

    if (!driver.driverLocation) {
      return res.status(400).json({
        success: false,
        error: { code: 'LOCATION_NOT_FOUND', message: 'Driver location must be set before querying rides' }
      });
    }

    if (!driver.vehicle) {
      return res.status(400).json({
        success: false,
        error: { code: 'VEHICLE_NOT_FOUND', message: 'Driver must have a registered vehicle' }
      });
    }

    const activeRides = await prisma.ride.findMany({
      where: {
        status: { in: [RideStatus.REQUESTED, RideStatus.SEARCHING_DRIVER] },
        declinedDrivers: {
          none: { driverId: driver.id }
        }
      },
      include: {
        payments: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });

    const dLat = driver.driverLocation.lat;
    const dLng = driver.driverLocation.lng;
    const vehicleType = driver.vehicle.type;

    const availableRides = activeRides
      .filter((ride) => {
        // Strict vehicle type compatibility
        if (ride.vehicleType !== vehicleType) return false;

        // Check distance <= 10.0 km
        const distance = calculateDistance(dLat, dLng, ride.pickupLat, ride.pickupLng);
        return distance <= 10.0;
      })
      .map((ride) => {
        const distance = calculateDistance(dLat, dLng, ride.pickupLat, ride.pickupLng);
        const paymentInfo = ride.payments[0];
        return {
          ...ride,
          paymentMethod: paymentInfo?.paymentMethod || (paymentInfo?.provider === 'CASH' ? 'CASH' : 'CARD'),
          paymentStatus: paymentInfo?.status || 'PENDING',
          distanceToPickup: distance
        };
      });

    // Sort by distance (nearest first)
    availableRides.sort((a, b) => a.distanceToPickup - b.distanceToPickup);

    return res.status(200).json({
      success: true,
      data: availableRides
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to query matching rides' }
    });
  }
}

/**
 * PATCH /api/driver/rides/:id/decline
 */
export async function declineRide(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { id } = req.params;
  const { reason } = req.body || {};

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

    const result = await DispatchService.handleDriverDecline(id, driver.id, reason);

    return res.status(200).json({
      success: true,
      data: {
        declined: true,
        dispatchedNext: result.dispatched
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to decline ride' }
    });
  }
}

/**
 * PATCH /api/driver/rides/:id/accept
 */
export async function acceptRide(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { id } = req.params;

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

    if (driver.status !== 'ONLINE') {
      return res.status(400).json({
        success: false,
        error: { code: 'DRIVER_OFFLINE', message: 'Driver must be ONLINE to accept rides' }
      });
    }

    if (!driver.isApproved) {
      return res.status(400).json({
        success: false,
        error: { code: 'DRIVER_UNAPPROVED', message: 'Driver account is pending approval' }
      });
    }

    const ride = await prisma.ride.findUnique({
      where: { id }
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' }
      });
    }

    // Check that the ride is still available
    if (ride.status !== RideStatus.REQUESTED && ride.status !== RideStatus.SEARCHING_DRIVER) {
      return res.status(400).json({
        success: false,
        error: { code: 'RIDE_ALREADY_CLAIMED', message: 'This ride has already been accepted or cancelled' }
      });
    }

    // Check vehicle type compatibility
    if (driver.vehicle && ride.vehicleType !== driver.vehicle.type) {
      return res.status(400).json({
        success: false,
        error: { code: 'INCOMPATIBLE_VEHICLE', message: 'Your vehicle type is not compatible with this ride request' }
      });
    }

    const currentStatus = ride.status;

    // Update ride atomically
    const updatedRide = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.ride.updateMany({
        where: {
          id,
          status: currentStatus // Concurrency check
        },
        data: {
          status: RideStatus.DRIVER_ASSIGNED,
          driverId: driver.id
        }
      });

      if (updateResult.count === 0) {
        throw new Error('CONCURRENT_MODIFICATION_DETECTED');
      }

      await tx.rideStatusHistory.create({
        data: {
          rideId: id,
          status: RideStatus.DRIVER_ASSIGNED
        }
      });

      // Set driver status to BUSY
      await tx.driver.update({
        where: { id: driver.id },
        data: { status: 'BUSY' }
      });

      return tx.ride.findUnique({
        where: { id },
        include: {
          driver: {
            include: {
              user: { select: { email: true } },
              vehicle: true
            }
          },
          customer: {
            include: {
              user: { select: { email: true } }
            }
          },
          payments: true
        }
      });
    });

    if (updatedRide) {
      emitToRide(id, 'ride_status_changed', { ride: updatedRide });
      emitToRole(UserRole.DRIVER, 'available_ride_removed', { rideId: id });
      await notifyRideStatusChange(id, RideStatus.DRIVER_ASSIGNED);
    }

    return res.status(200).json({
      success: true,
      data: updatedRide
    });

  } catch (error: any) {
    if (error.message === 'CONCURRENT_MODIFICATION_DETECTED') {
      return res.status(409).json({
        success: false,
        error: { code: 'CONCURRENT_MODIFICATION', message: 'This ride was accepted by another driver' }
      });
    }
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to accept ride' }
    });
  }
}

/**
 * PATCH /api/driver/rides/:id/release
 */
export async function releaseRide(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { id } = req.params;

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
        error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found' }
      });
    }

    // Verification: must be assigned to this driver
    if (ride.driverId !== driver.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: You are not assigned to this ride' }
      });
    }

    if (ride.status !== RideStatus.DRIVER_ASSIGNED && ride.status !== RideStatus.DRIVER_ARRIVING) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Cannot release a ride after it has started' }
      });
    }

    const currentStatus = ride.status;

    // Update ride atomically
    const releasedRide = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.ride.updateMany({
        where: {
          id,
          status: currentStatus // Concurrency check
        },
        data: {
          status: RideStatus.SEARCHING_DRIVER,
          driverId: null
        }
      });

      if (updateResult.count === 0) {
        throw new Error('CONCURRENT_MODIFICATION_DETECTED');
      }

      await tx.rideStatusHistory.create({
        data: {
          rideId: id,
          status: RideStatus.SEARCHING_DRIVER
        }
      });

      // Set driver status back to ONLINE
      await tx.driver.update({
        where: { id: driver.id },
        data: { status: 'ONLINE' }
      });

      return tx.ride.findUnique({ where: { id } });
    });

    if (releasedRide) {
      emitToRide(id, 'ride_status_changed', { ride: releasedRide });
      emitToRole(UserRole.DRIVER, 'available_ride_created', { ride: releasedRide });
      await notifyRideStatusChange(id, RideStatus.CANCELLED);
    }

    return res.status(200).json({
      success: true,
      data: releasedRide
    });

  } catch (error: any) {
    if (error.message === 'CONCURRENT_MODIFICATION_DETECTED') {
      return res.status(409).json({
        success: false,
        error: { code: 'CONCURRENT_MODIFICATION', message: 'Stale ride state detected. Reload and retry.' }
      });
    }
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to release ride' }
    });
  }
}

/**
 * Utility: Sends push notifications and logs local database alerts on ride status changes.
 */
export async function notifyRideStatusChange(rideId: string, status: RideStatus) {
  try {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        customer: { include: { user: true } },
        driver: { include: { user: true } }
      }
    });

    if (!ride) return;

    const customerToken = ride.customer.user.fcmToken;
    const driverToken = ride.driver?.user.fcmToken;

    switch (status) {
      case RideStatus.DRIVER_ASSIGNED:
        if (customerToken) {
          await sendPushNotification(
            customerToken,
            'Ride Booked!',
            'Your ride request has been accepted. The driver is on the way.',
            { rideId, status }
          );
        }
        break;

      case RideStatus.DRIVER_ARRIVING:
        if (customerToken) {
          await sendPushNotification(
            customerToken,
            'Driver Arriving',
            'Your driver is arriving shortly at the pickup location.',
            { rideId, status }
          );
        }
        break;

      case RideStatus.DRIVER_ARRIVED:
        if (customerToken) {
          await sendPushNotification(
            customerToken,
            'Driver Arrived',
            'Your driver has arrived at the pickup location. Please meet them.',
            { rideId, status }
          );
        }
        break;

      case RideStatus.RIDE_STARTED:
        if (customerToken) {
          await sendPushNotification(
            customerToken,
            'Trip Started',
            'Your trip has started. Have a safe journey!',
            { rideId, status }
          );
        }
        break;

      case RideStatus.RIDE_COMPLETED:
        if (customerToken) {
          await sendPushNotification(
            customerToken,
            'Trip Completed',
            'You have arrived at your destination. Thank you for riding with us!',
            { rideId, status }
          );
        }
        break;

      case RideStatus.CANCELLED:
        if (ride.driverId && driverToken) {
          await sendPushNotification(
            driverToken,
            'Ride Cancelled',
            'The customer has cancelled the ride request.',
            { rideId, status }
          );
        }
        if (customerToken) {
          await sendPushNotification(
            customerToken,
            'Ride Cancelled',
            'Your ride booking has been cancelled.',
            { rideId, status }
          );
        }
        break;

      case RideStatus.NO_DRIVER_AVAILABLE:
        if (customerToken) {
          await sendPushNotification(
            customerToken,
            'No Driver Available',
            'We could not find a driver for your request. Please try again.',
            { rideId, status }
          );
        }
        break;
    }

    // Write database notification log for the customer
    if (
      status === RideStatus.DRIVER_ASSIGNED ||
      status === RideStatus.DRIVER_ARRIVING ||
      status === RideStatus.DRIVER_ARRIVED ||
      status === RideStatus.RIDE_STARTED ||
      status === RideStatus.RIDE_COMPLETED ||
      status === RideStatus.CANCELLED ||
      status === RideStatus.NO_DRIVER_AVAILABLE
    ) {
      let title = '';
      let body = '';

      if (status === RideStatus.DRIVER_ASSIGNED) {
        title = 'Ride Booked!';
        body = 'Your ride request has been accepted. The driver is on the way.';
      } else if (status === RideStatus.DRIVER_ARRIVING) {
        title = 'Driver Arriving';
        body = 'Your driver is arriving shortly at the pickup location.';
      } else if (status === RideStatus.DRIVER_ARRIVED) {
        title = 'Driver Arrived';
        body = 'Your driver has arrived at the pickup location. Please meet them.';
      } else if (status === RideStatus.RIDE_STARTED) {
        title = 'Trip Started';
        body = 'Your trip has started. Have a safe journey!';
      } else if (status === RideStatus.RIDE_COMPLETED) {
        title = 'Trip Completed';
        body = 'You have arrived at your destination. Thank you for riding with us!';
      } else if (status === RideStatus.CANCELLED) {
        title = 'Ride Cancelled';
        body = 'Your ride booking has been cancelled.';
      } else if (status === RideStatus.NO_DRIVER_AVAILABLE) {
        title = 'No Driver Available';
        body = 'We could not find a driver for your request. Please try again.';
      }

      await prisma.notification.create({
        data: {
          customerId: ride.customerId,
          title,
          body,
          isRead: false
        }
      });
    }

  } catch (error) {
    console.error('Failed to send ride status notifications:', error);
  }
}

/**
 * POST /api/customer/rides/:id/confirm-payment
 */
export async function confirmRidePayment(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { id } = req.params;

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

    const ride = await prisma.ride.findFirst({
      where: { id, customerId: customer.id },
      include: { payments: true }
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found or ownership mismatched' }
      });
    }

    const payment = ride.payments[0];
    if (!payment || !payment.transactionId) {
      return res.status(400).json({
        success: false,
        error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment intent record not found for this ride' }
      });
    }

    // Retrieve status from Stripe
    const intent = await stripe.paymentIntents.retrieve(payment.transactionId);

    if (intent.status === 'requires_capture') {
      const updatedRide = await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.AUTHORIZED }
        });

        const rideData = await tx.ride.update({
          where: { id: ride.id },
          data: { status: RideStatus.SEARCHING_DRIVER }
        });

        await tx.rideStatusHistory.create({
          data: {
            rideId: ride.id,
            status: RideStatus.SEARCHING_DRIVER
          }
        });

        return rideData;
      });

      // Broadcast available ride to online drivers
      emitToRole(UserRole.DRIVER, 'available_ride_created', { ride: updatedRide });

      return res.status(200).json({
        success: true,
        message: 'Payment authorized and matching started',
        status: intent.status
      });
    }

    return res.status(400).json({
      success: false,
      error: { code: 'PAYMENT_NOT_AUTHORIZED', message: `Card authorization state: ${intent.status}` }
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to confirm pre-authorization hold' }
    });
  }
}
