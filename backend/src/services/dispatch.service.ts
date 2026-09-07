import { PrismaClient, RideStatus, VehicleType, DriverStatus, UserRole } from '@prisma/client';
import { emitToRole, emitToUser, emitToRide } from '../socket';
import { sendPushNotification } from '../utils/firebase';
import { calculateDistance } from '../controllers/ride.controller';

const prisma = new PrismaClient();

export class DispatchService {
  /**
   * Finds all eligible, approved, online drivers whose vehicle strictly matches
   * the requested ride's vehicle type, and who are not already busy with an active trip.
   */
  static async findEligibleDrivers(rideId: string) {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        declinedDrivers: true,
        customer: { include: { user: true } }
      }
    });

    if (!ride) return [];
    if (ride.status !== RideStatus.REQUESTED && ride.status !== RideStatus.SEARCHING_DRIVER) {
      return [];
    }

    const declinedIds = ride.declinedDrivers.map(d => d.driverId);

    // Query active and eligible drivers
    const drivers = await prisma.driver.findMany({
      where: {
        id: { notIn: declinedIds },
        isApproved: true,
        isSuspended: false,
        status: DriverStatus.ONLINE,
        vehicle: {
          type: ride.vehicleType // STRICT vehicle type matching
        },
        // Must not be currently assigned to any active in-progress ride
        rides: {
          none: {
            status: {
              in: [
                RideStatus.DRIVER_ASSIGNED,
                RideStatus.DRIVER_ARRIVING,
                RideStatus.DRIVER_ARRIVED,
                RideStatus.RIDE_STARTED
              ]
            }
          }
        }
      },
      include: {
        user: { select: { id: true, email: true, fcmToken: true } },
        vehicle: true,
        driverLocation: true
      }
    });

    // Sort by proximity to pickup location if GPS location is available
    const enriched = drivers.map(d => {
      let distanceToPickup = 999;
      if (d.driverLocation) {
        distanceToPickup = calculateDistance(
          d.driverLocation.lat,
          d.driverLocation.lng,
          ride.pickupLat,
          ride.pickupLng
        );
      }
      return {
        ...d,
        distanceToPickup
      };
    });

    // Prioritize nearest available driver
    enriched.sort((a, b) => a.distanceToPickup - b.distanceToPickup);

    return enriched;
  }

  /**
   * Automatically dispatches a ride to eligible matching drivers.
   * Emits real-time socket events and sends push notifications.
   */
  static async dispatchRide(rideId: string) {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        customer: { include: { user: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });

    if (!ride) return { dispatched: false, count: 0 };
    if (ride.status !== RideStatus.REQUESTED && ride.status !== RideStatus.SEARCHING_DRIVER) {
      return { dispatched: false, count: 0 };
    }

    const eligibleDrivers = await this.findEligibleDrivers(rideId);

    if (eligibleDrivers.length === 0) {
      // Notify customer that search is ongoing or no drivers right now
      emitToRide(rideId, 'ride_search_update', {
        rideId,
        status: ride.status,
        message: 'Searching for nearby captains...'
      });
      return { dispatched: false, count: 0 };
    }

    const paymentInfo = ride.payments[0];
    const payload = {
      id: ride.id,
      pickupAddress: ride.pickupAddress,
      pickupLat: ride.pickupLat,
      pickupLng: ride.pickupLng,
      dropoffAddress: ride.dropoffAddress,
      dropoffLat: ride.dropoffLat,
      dropoffLng: ride.dropoffLng,
      fare: ride.fare,
      distance: ride.distance,
      duration: ride.duration,
      vehicleType: ride.vehicleType,
      paymentMethod: paymentInfo?.paymentMethod || (paymentInfo?.provider === 'CASH' ? 'CASH' : 'CARD'),
      paymentStatus: paymentInfo?.status || 'PENDING',
      createdAt: ride.createdAt
    };

    // Target ONLY eligible matching drivers for this vehicle category
    for (const driver of eligibleDrivers) {
      // 1. Direct targeted socket event to the driver's private user channel
      emitToUser(driver.userId, 'incoming_ride_request', {
        ride: {
          ...payload,
          distanceToPickup: driver.distanceToPickup !== 999 ? driver.distanceToPickup : undefined
        }
      });

      // 2. Mobile push notification with sound to matching driver's FCM token
      if (driver.user?.fcmToken) {
        sendPushNotification(
          driver.user.fcmToken,
          `⚡ New ${ride.vehicleType} Ride Request!`,
          `Pickup at ${ride.pickupAddress} · Fare: ₹${ride.fare.toFixed(0)}`,
          { rideId: ride.id, vehicleType: ride.vehicleType, action: 'INCOMING_RIDE' }
        ).catch(() => {});
      }
    }

    return {
      dispatched: true,
      count: eligibleDrivers.length,
      driverIds: eligibleDrivers.map(d => d.id)
    };
  }

  /**
   * Handles when a driver declines a ride request.
   * Records the decline and rolls over dispatch to the next available driver.
   */
  static async handleDriverDecline(rideId: string, driverId: string, reason?: string) {
    // Record that this driver declined this specific ride
    await prisma.rideDeclinedDriver.upsert({
      where: {
        rideId_driverId: {
          rideId,
          driverId
        }
      },
      update: {
        reason: reason || 'DRIVER_DECLINED'
      },
      create: {
        rideId,
        driverId,
        reason: reason || 'DRIVER_DECLINED'
      }
    });

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: true }
    });

    if (driver) {
      emitToUser(driver.userId, 'incoming_ride_cancelled', { rideId });
    }

    // Immediately dispatch to next available candidate
    return this.dispatchRide(rideId);
  }

  /**
   * 1-Click Auto-Assign: Atomically selects the best matching online driver and assigns them.
   */
  static async autoAssignBestDriver(rideId: string) {
    const eligible = await this.findEligibleDrivers(rideId);
    if (eligible.length === 0) {
      throw new Error('NO_MATCHING_DRIVERS_AVAILABLE');
    }

    const selectedDriver = eligible[0];

    const updatedRide = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.ride.updateMany({
        where: {
          id: rideId,
          status: { in: [RideStatus.REQUESTED, RideStatus.SEARCHING_DRIVER, RideStatus.NO_DRIVER_AVAILABLE] }
        },
        data: {
          status: RideStatus.DRIVER_ASSIGNED,
          driverId: selectedDriver.id
        }
      });

      if (updateResult.count === 0) {
        throw new Error('CONCURRENT_MODIFICATION_DETECTED');
      }

      await tx.rideStatusHistory.create({
        data: {
          rideId,
          status: RideStatus.DRIVER_ASSIGNED,
          note: `Automatically assigned Captain ${selectedDriver.name || selectedDriver.phone} (${selectedDriver.vehicle?.plateNumber})`
        }
      });

      await tx.driver.update({
        where: { id: selectedDriver.id },
        data: { status: DriverStatus.BUSY }
      });

      return tx.ride.findUnique({
        where: { id: rideId },
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
      emitToRide(rideId, 'ride_status_changed', { ride: updatedRide });
      emitToRole(UserRole.DRIVER, 'available_ride_removed', { rideId });
      if (selectedDriver.user) {
        emitToUser(selectedDriver.userId, 'ride_assigned', { ride: updatedRide });
      }
    }

    return updatedRide;
  }
}
