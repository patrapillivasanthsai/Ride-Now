import request from 'supertest';
import { PrismaClient, UserRole, RideStatus, VehicleType, DriverStatus } from '@prisma/client';
import app from '../app';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

describe('Driver Matching & Ride Assignment Integration Tests', () => {
  const customerEmail = `cust-${Date.now()}@example.com`;
  const driverEmail = `driv-${Date.now()}@example.com`;
  const otherDriverEmail = `other-driv-${Date.now()}@example.com`;
  const password = 'testPassword123';

  let customerId: string;
  let customerProfileId: string;
  let customerToken: string;

  let driverId: string;
  let driverProfileId: string;
  let driverToken: string;

  let otherDriverId: string;
  let otherDriverProfileId: string;
  let otherDriverToken: string;

  let testRideId: string;

  beforeAll(async () => {
    // 1. Create Customer
    const customerUser = await prisma.user.create({
      data: {
        email: customerEmail,
        password: 'hashedPasswordPlaceholder',
        role: UserRole.CUSTOMER,
        customer: {
          create: { phone: '+15559990001' },
        },
      },
      include: { customer: true },
    });
    customerId = customerUser.id;
    customerProfileId = customerUser.customer!.id;
    customerToken = generateToken({ userId: customerUser.id, role: customerUser.role });

    // 2. Create Driver (Approved, Online, location configured, Sedan vehicle)
    const driverUser = await prisma.user.create({
      data: {
        email: driverEmail,
        password: 'hashedPasswordPlaceholder',
        role: UserRole.DRIVER,
        driver: {
          create: {
            phone: '+15559990002',
            isApproved: true,
            status: DriverStatus.ONLINE,
            vehicle: {
              create: {
                make: 'Toyota',
                model: 'Camry',
                year: 2021,
                color: 'Black',
                plateNumber: `PLT-MCH-${Date.now()}`,
                type: VehicleType.CAB,
              },
            },
            driverLocation: {
              create: {
                lat: 12.9716,
                lng: 77.5946,
              },
            },
          },
        },
      },
      include: { driver: true },
    });
    driverId = driverUser.id;
    driverProfileId = driverUser.driver!.id;
    driverToken = generateToken({ userId: driverUser.id, role: driverUser.role });

    // 3. Create another Driver (Approved, Online, location configured, Sedan vehicle)
    const otherDriverUser = await prisma.user.create({
      data: {
        email: otherDriverEmail,
        password: 'hashedPasswordPlaceholder',
        role: UserRole.DRIVER,
        driver: {
          create: {
            phone: '+15559990003',
            isApproved: true,
            status: DriverStatus.ONLINE,
            vehicle: {
              create: {
                make: 'Honda',
                model: 'Civic',
                year: 2022,
                color: 'White',
                plateNumber: `PLT-OTH-${Date.now()}`,
                type: VehicleType.CAB,
              },
            },
            driverLocation: {
              create: {
                lat: 12.9718,
                lng: 77.5948,
              },
            },
          },
        },
      },
      include: { driver: true },
    });
    otherDriverId = otherDriverUser.id;
    otherDriverProfileId = otherDriverUser.driver!.id;
    otherDriverToken = generateToken({ userId: otherDriverUser.id, role: otherDriverUser.role });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.driverLocation.deleteMany({
      where: { driverId: { in: [driverProfileId, otherDriverProfileId] } },
    });
    await prisma.rideStatusHistory.deleteMany({
      where: { rideId: { in: [testRideId] } },
    });
    await prisma.ride.deleteMany({
      where: { id: testRideId },
    });
    await prisma.vehicle.deleteMany({
      where: { driverId: { in: [driverProfileId, otherDriverProfileId] } },
    });
    await prisma.driver.deleteMany({
      where: { id: { in: [driverProfileId, otherDriverProfileId] } },
    });
    await prisma.customer.deleteMany({
      where: { id: customerProfileId },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [customerId, driverId, otherDriverId] } },
    });
    await prisma.$disconnect();
  });

  describe('GET /api/driver/rides/available', () => {
    beforeEach(async () => {
      // Create a test ride request close to driver location (approx 1.5 km away)
      const ride = await prisma.ride.create({
        data: {
          customerId: customerProfileId,
          pickupAddress: 'Vasanth Nagar, Bengaluru',
          pickupLat: 12.9802,
          pickupLng: 77.5928,
          dropoffAddress: 'Koramangala, Bengaluru',
          dropoffLat: 12.9352,
          dropoffLng: 77.6245,
          fare: 150.0,
          vehicleType: VehicleType.CAB,
          status: RideStatus.SEARCHING_DRIVER,
        },
      });
      testRideId = ride.id;
    });

    afterEach(async () => {
      await prisma.rideStatusHistory.deleteMany({ where: { rideId: testRideId } });
      await prisma.ride.deleteMany({ where: { id: testRideId } });
    });

    it('1. Retrieves nearby available rides matching vehicle type', async () => {
      const res = await request(app)
        .get('/api/driver/rides/available')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const ride = res.body.data.find((r: any) => r.id === testRideId);
      expect(ride).toBeDefined();
      expect(ride.distanceToPickup).toBeLessThan(5.0);
    });

    it('2. Excludes rides beyond 5.0 km radius limit', async () => {
      // Move driver far away (approx 20 km away)
      await prisma.driverLocation.update({
        where: { driverId: driverProfileId },
        data: { lat: 13.15, lng: 77.59 },
      });

      const res = await request(app)
        .get('/api/driver/rides/available')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0); // Excluded due to distance

      // Reset location
      await prisma.driverLocation.update({
        where: { driverId: driverProfileId },
        data: { lat: 12.9716, lng: 77.5946 },
      });
    });

    it('3. Rejects query if driver is OFFLINE', async () => {
      // Set status to OFFLINE
      await prisma.driver.update({
        where: { id: driverProfileId },
        data: { status: DriverStatus.OFFLINE },
      });

      const res = await request(app)
        .get('/api/driver/rides/available')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DRIVER_OFFLINE');

      // Reset status
      await prisma.driver.update({
        where: { id: driverProfileId },
        data: { status: DriverStatus.ONLINE },
      });
    });

    it('4. Rejects query if driver is not approved', async () => {
      // Set approved flag to false
      await prisma.driver.update({
        where: { id: driverProfileId },
        data: { isApproved: false },
      });

      const res = await request(app)
        .get('/api/driver/rides/available')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DRIVER_UNAPPROVED');

      // Reset approved flag
      await prisma.driver.update({
        where: { id: driverProfileId },
        data: { isApproved: true },
      });
    });
  });

  describe('PATCH /api/driver/rides/:id/accept', () => {
    beforeEach(async () => {
      const ride = await prisma.ride.create({
        data: {
          customerId: customerProfileId,
          pickupAddress: 'Vasanth Nagar',
          pickupLat: 12.9802,
          pickupLng: 77.5928,
          dropoffAddress: 'Koramangala',
          dropoffLat: 12.9352,
          dropoffLng: 77.6245,
          fare: 150.0,
          vehicleType: VehicleType.CAB,
          status: RideStatus.SEARCHING_DRIVER,
        },
      });
      testRideId = ride.id;
    });

    afterEach(async () => {
      await prisma.rideStatusHistory.deleteMany({ where: { rideId: testRideId } });
      await prisma.ride.deleteMany({ where: { id: testRideId } });
    });

    it('1. Driver accepts ride successfully, status changes to DRIVER_ASSIGNED and driver becomes BUSY', async () => {
      const res = await request(app)
        .patch(`/api/driver/rides/${testRideId}/accept`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRIVER_ASSIGNED');
      expect(res.body.data.driverId).toBe(driverProfileId);

      // Verify driver is now BUSY
      const dbDriver = await prisma.driver.findUnique({ where: { id: driverProfileId } });
      expect(dbDriver?.status).toBe('BUSY');

      // Restore status to ONLINE for other tests
      await prisma.driver.update({
        where: { id: driverProfileId },
        data: { status: DriverStatus.ONLINE },
      });
    });

    it('2. Double acceptance: Second driver receives 400 RIDE_ALREADY_CLAIMED or 409 Conflict', async () => {
      // First driver accepts
      await request(app)
        .patch(`/api/driver/rides/${testRideId}/accept`)
        .set('Authorization', `Bearer ${driverToken}`);

      // Reset driver status to ONLINE to allow other tests
      await prisma.driver.update({
        where: { id: driverProfileId },
        data: { status: DriverStatus.ONLINE },
      });

      // Second driver attempts acceptance
      const res = await request(app)
        .patch(`/api/driver/rides/${testRideId}/accept`)
        .set('Authorization', `Bearer ${otherDriverToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RIDE_ALREADY_CLAIMED');
    });
  });

  describe('PATCH /api/driver/rides/:id/release', () => {
    beforeEach(async () => {
      // Create ride assigned to driver
      const ride = await prisma.ride.create({
        data: {
          customerId: customerProfileId,
          driverId: driverProfileId,
          pickupAddress: 'Vasanth Nagar',
          pickupLat: 12.9802,
          pickupLng: 77.5928,
          dropoffAddress: 'Koramangala',
          dropoffLat: 12.9352,
          dropoffLng: 77.6245,
          fare: 150.0,
          vehicleType: VehicleType.CAB,
          status: RideStatus.DRIVER_ASSIGNED,
        },
      });
      testRideId = ride.id;
      // Set driver to BUSY
      await prisma.driver.update({
        where: { id: driverProfileId },
        data: { status: DriverStatus.BUSY },
      });
    });

    afterEach(async () => {
      await prisma.rideStatusHistory.deleteMany({ where: { rideId: testRideId } });
      await prisma.ride.deleteMany({ where: { id: testRideId } });
      await prisma.driver.update({
        where: { id: driverProfileId },
        data: { status: DriverStatus.ONLINE },
      });
    });

    it('1. Driver releases ride successfully, returning status to SEARCHING_DRIVER and driver to ONLINE', async () => {
      const res = await request(app)
        .patch(`/api/driver/rides/${testRideId}/release`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SEARCHING_DRIVER');
      expect(res.body.data.driverId).toBeNull();

      // Verify driver status
      const dbDriver = await prisma.driver.findUnique({ where: { id: driverProfileId } });
      expect(dbDriver?.status).toBe('ONLINE');
    });

    it('2. Another driver cannot release this ride', async () => {
      const res = await request(app)
        .patch(`/api/driver/rides/${testRideId}/release`)
        .set('Authorization', `Bearer ${otherDriverToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Stale Ride Timeout Expiration Check', () => {
    beforeEach(async () => {
      // Create a requested ride
      const ride = await prisma.ride.create({
        data: {
          customerId: customerProfileId,
          pickupAddress: 'Timeout Start',
          pickupLat: 12.9,
          pickupLng: 77.5,
          dropoffAddress: 'Timeout End',
          dropoffLat: 12.95,
          dropoffLng: 77.55,
          fare: 100.0,
          vehicleType: VehicleType.CAB,
          status: RideStatus.SEARCHING_DRIVER,
        },
      });
      testRideId = ride.id;

      // Force update createdAt back by 3 minutes (180 seconds ago) to simulate timeout
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      await prisma.ride.update({
        where: { id: testRideId },
        data: { createdAt: threeMinutesAgo },
      });
    });

    afterEach(async () => {
      await prisma.rideStatusHistory.deleteMany({ where: { rideId: testRideId } });
      await prisma.ride.deleteMany({ where: { id: testRideId } });
    });

    it('1. Triggers auto-expiration to NO_DRIVER_AVAILABLE when customer queries stale ride details', async () => {
      const res = await request(app)
        .get(`/api/customer/rides/${testRideId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('NO_DRIVER_AVAILABLE');

      // Verify in DB
      const dbRide = await prisma.ride.findUnique({ where: { id: testRideId } });
      expect(dbRide?.status).toBe('NO_DRIVER_AVAILABLE');
    });
  });
});
