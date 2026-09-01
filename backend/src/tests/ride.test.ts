import request from 'supertest';
import { PrismaClient, UserRole, RideStatus, VehicleType } from '@prisma/client';
import app from '../app';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

describe('Ride Booking & State Machine Integration Tests', () => {
  const customerEmail = `cust-${Date.now()}@example.com`;
  const driverEmail = `driv-${Date.now()}@example.com`;
  const otherCustomerEmail = `other-cust-${Date.now()}@example.com`;
  const otherDriverEmail = `other-driv-${Date.now()}@example.com`;
  const password = 'testPassword123';

  let customerId: string;
  let customerProfileId: string;
  let customerToken: string;

  let otherCustomerProfileId: string;
  let otherCustomerToken: string;

  let driverId: string;
  let driverProfileId: string;
  let driverToken: string;

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
          create: { phone: '+15550001111' },
        },
      },
      include: { customer: true },
    });
    customerId = customerUser.id;
    customerProfileId = customerUser.customer!.id;
    customerToken = generateToken({ userId: customerUser.id, role: customerUser.role });

    // 2. Create another Customer (for ownership check tests)
    const otherUser = await prisma.user.create({
      data: {
        email: otherCustomerEmail,
        password: 'hashedPasswordPlaceholder',
        role: UserRole.CUSTOMER,
        customer: {
          create: { phone: '+15550002222' },
        },
      },
      include: { customer: true },
    });
    otherCustomerProfileId = otherUser.customer!.id;
    otherCustomerToken = generateToken({ userId: otherUser.id, role: otherUser.role });

    // 3. Create Driver
    const driverUser = await prisma.user.create({
      data: {
        email: driverEmail,
        password: 'hashedPasswordPlaceholder',
        role: UserRole.DRIVER,
        driver: {
          create: {
            phone: '+15550003333',
            vehicle: {
              create: {
                make: 'Toyota',
                model: 'Camry',
                year: 2021,
                color: 'White',
                plateNumber: `PLT-RIDE-${Date.now()}`,
                type: VehicleType.CAB,
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

    // 4. Create another Driver
    const otherDriverUser = await prisma.user.create({
      data: {
        email: otherDriverEmail,
        password: 'hashedPasswordPlaceholder',
        role: UserRole.DRIVER,
        driver: {
          create: {
            phone: '+15550004444',
            vehicle: {
              create: {
                make: 'Ford',
                model: 'Explorer',
                year: 2020,
                color: 'Black',
                plateNumber: `PLT-OTH-${Date.now()}`,
                type: VehicleType.CAB,
              },
            },
          },
        },
      },
      include: { driver: true },
    });
    otherDriverProfileId = otherDriverUser.driver!.id;
    otherDriverToken = generateToken({ userId: otherDriverUser.id, role: otherDriverUser.role });

    // Create pricing seed if not present (although seed script usually created it)
    await prisma.pricing.upsert({
      where: { vehicleType: VehicleType.CAB },
      update: {},
      create: {
        vehicleType: VehicleType.CAB,
        baseFare: 5.0,
        perKmRate: 1.5,
        perMinuteRate: 0.2,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
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
      where: { id: { in: [customerProfileId, otherCustomerProfileId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [customerId, otherCustomerProfileId, driverId, otherDriverProfileId] } },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/customer/rides/estimate', () => {
    it('1. Calculates fare estimate successfully based on coordinates and pricing model', async () => {
      const res = await request(app)
        .post('/api/customer/rides/estimate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          pickupLat: 12.9716,
          pickupLng: 77.5946,
          dropoffLat: 12.9352,
          dropoffLng: 77.6245,
          vehicleType: 'CAB',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vehicleType).toBe('CAB');
      expect(res.body.data.distance).toBeGreaterThan(0);
      expect(res.body.data.totalFare).toBeGreaterThan(5.0); // should be greater than base fare
    });

    it('2. Rejects invalid coordinate boundaries', async () => {
      const res = await request(app)
        .post('/api/customer/rides/estimate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          pickupLat: 100.0, // Invalid latitude (> 90)
          pickupLng: 77.5946,
          dropoffLat: 12.9352,
          dropoffLng: 77.6245,
          vehicleType: 'CAB',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('3. Rejects invalid vehicle type', async () => {
      const res = await request(app)
        .post('/api/customer/rides/estimate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          pickupLat: 12.9716,
          pickupLng: 77.5946,
          dropoffLat: 12.9352,
          dropoffLng: 77.6245,
          vehicleType: 'INVALID_TYPE',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/customer/rides', () => {
    it('1. Customer requests a ride successfully, creating database and history entries', async () => {
      const res = await request(app)
        .post('/api/customer/rides')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          pickupAddress: 'Vasanth Nagar, Bengaluru',
          pickupLat: 12.9802,
          pickupLng: 77.5928,
          dropoffAddress: 'Koramangala, Bengaluru',
          dropoffLat: 12.9352,
          dropoffLng: 77.6245,
          vehicleType: 'CAB',
          paymentMethodId: 'pm_requires_action'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('REQUESTED');
      expect(res.body.data.customerId).toBe(customerProfileId);
      expect(res.body.data.fare).toBeGreaterThan(0);

      testRideId = res.body.data.id;

      // Verify history
      const history = await prisma.rideStatusHistory.findMany({
        where: { rideId: testRideId },
      });
      expect(history.length).toBe(1);
      expect(history[0].status).toBe('REQUESTED');
    });
  });

  describe('Ride State Machine Transition Checks', () => {
    it('1. System starts matching: transitions REQUESTED -> SEARCHING_DRIVER', async () => {
      const res = await request(app)
        .patch(`/api/driver/rides/${testRideId}/status`)
        .set('Authorization', `Bearer ${driverToken}`) // matching engine simulation
        .send({ status: 'SEARCHING_DRIVER' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('SEARCHING_DRIVER');
    });

    it('2. Driver accepts: transitions SEARCHING_DRIVER -> DRIVER_ASSIGNED and links driver', async () => {
      const res = await request(app)
        .patch(`/api/driver/rides/${testRideId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'DRIVER_ASSIGNED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('DRIVER_ASSIGNED');
      expect(res.body.data.driverId).toBe(driverProfileId);
    });

    it('3. Rejects other driver trying to change status of assigned ride (ownership check)', async () => {
      const res = await request(app)
        .patch(`/api/driver/rides/${testRideId}/status`)
        .set('Authorization', `Bearer ${otherDriverToken}`)
        .send({ status: 'DRIVER_ARRIVING' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('4. Rejects invalid transition (e.g. DRIVER_ASSIGNED -> RIDE_STARTED directly)', async () => {
      const res = await request(app)
        .patch(`/api/driver/rides/${testRideId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'RIDE_STARTED' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TRANSITION');
    });

    it('5. Transitions successfully DRIVER_ASSIGNED -> DRIVER_ARRIVING', async () => {
      const res = await request(app)
        .patch(`/api/driver/rides/${testRideId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'DRIVER_ARRIVING' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('DRIVER_ARRIVING');
    });

    it('6. Transitions successfully DRIVER_ARRIVING -> DRIVER_ARRIVED', async () => {
      const res = await request(app)
        .patch(`/api/driver/rides/${testRideId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'DRIVER_ARRIVED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('DRIVER_ARRIVED');
    });

    it('7. Transitions successfully DRIVER_ARRIVED -> RIDE_STARTED', async () => {
      const currentRide = await prisma.ride.findUnique({ where: { id: testRideId } });
      const res = await request(app)
        .patch(`/api/driver/rides/${testRideId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'RIDE_STARTED', otp: currentRide?.otp });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('RIDE_STARTED');
    });

    it('8. Rejects customer cancellation after ride has started', async () => {
      const res = await request(app)
        .patch(`/api/customer/rides/${testRideId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TRANSITION');
    });

    it('9. Transitions successfully RIDE_STARTED -> RIDE_COMPLETED', async () => {
      const res = await request(app)
        .patch(`/api/driver/rides/${testRideId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'RIDE_COMPLETED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('RIDE_COMPLETED');
    });

    it('10. Checks RideStatusHistory records are properly structured', async () => {
      const history = await prisma.rideStatusHistory.findMany({
        where: { rideId: testRideId },
        orderBy: { createdAt: 'asc' },
      });

      // Statuses logged: REQUESTED, SEARCHING_DRIVER, DRIVER_ASSIGNED, DRIVER_ARRIVING, DRIVER_ARRIVED, RIDE_STARTED, RIDE_COMPLETED
      expect(history.length).toBe(7);
      expect(history[0].status).toBe('REQUESTED');
      expect(history[6].status).toBe('RIDE_COMPLETED');
    });
  });

  describe('Customer Cancel Routing & Ownership Gates', () => {
    let cancelRideId: string;

    beforeEach(async () => {
      // Create a temporary ride to test cancellation rules
      const ride = await prisma.ride.create({
        data: {
          customerId: customerProfileId,
          pickupAddress: 'Start point',
          pickupLat: 12.9,
          pickupLng: 77.5,
          dropoffAddress: 'End point',
          dropoffLat: 12.95,
          dropoffLng: 77.55,
          fare: 100.0,
          status: 'REQUESTED',
        },
      });
      cancelRideId = ride.id;
    });

    afterEach(async () => {
      await prisma.rideStatusHistory.deleteMany({ where: { rideId: cancelRideId } });
      await prisma.ride.deleteMany({ where: { id: cancelRideId } });
    });

    it('1. Owner customer can cancel their requested ride', async () => {
      const res = await request(app)
        .patch(`/api/customer/rides/${cancelRideId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELLED');
    });

    it('2. Other customer is forbidden from cancelling this ride', async () => {
      const res = await request(app)
        .patch(`/api/customer/rides/${cancelRideId}/cancel`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
