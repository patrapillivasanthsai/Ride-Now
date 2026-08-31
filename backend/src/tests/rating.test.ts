import request from 'supertest';
import { PrismaClient, UserRole, RideStatus, VehicleType } from '@prisma/client';
import app from '../app';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

describe('Ratings & Reviews Integration Tests', () => {
  let customerId: string;
  let customerProfileId: string;
  let customerToken: string;

  let driverId: string;
  let driverProfileId: string;
  let driverToken: string;

  let otherCustomerId: string;
  let otherCustomerToken: string;

  let completedRideId: string;
  let activeRideId: string;

  beforeAll(async () => {
    // 1. Create Customer
    const customerUser = await prisma.user.create({
      data: {
        email: `cust-${Date.now()}@rate-test.com`,
        password: 'hashedPassword',
        role: UserRole.CUSTOMER,
        customer: { create: { phone: '+15558880001' } },
      },
      include: { customer: true },
    });
    customerId = customerUser.id;
    customerProfileId = customerUser.customer!.id;
    customerToken = generateToken({ userId: customerUser.id, role: customerUser.role });

    // 2. Create another Customer (for ownership check validation)
    const otherCustUser = await prisma.user.create({
      data: {
        email: `cust-other-${Date.now()}@rate-test.com`,
        password: 'hashedPassword',
        role: UserRole.CUSTOMER,
        customer: { create: { phone: '+15558880002' } },
      },
      include: { customer: true },
    });
    otherCustomerId = otherCustUser.id;
    otherCustomerToken = generateToken({ userId: otherCustUser.id, role: otherCustUser.role });

    // 3. Create Driver
    const driverUser = await prisma.user.create({
      data: {
        email: `driv-${Date.now()}@rate-test.com`,
        password: 'hashedPassword',
        role: UserRole.DRIVER,
        driver: {
          create: {
            phone: '+15558880003',
            isApproved: true,
            status: 'ONLINE',
            vehicle: {
              create: {
                make: 'Nissan',
                model: 'Leaf',
                year: 2022,
                color: 'Black',
                plateNumber: `PLT-RATE-${Date.now()}`,
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

    // 4. Create Completed Ride
    const completedRide = await prisma.ride.create({
      data: {
        customerId: customerProfileId,
        driverId: driverProfileId,
        pickupAddress: 'Pickup Point',
        pickupLat: 12.97,
        pickupLng: 77.59,
        dropoffAddress: 'Dropoff Point',
        dropoffLat: 12.95,
        dropoffLng: 77.61,
        fare: 120.00,
        status: RideStatus.RIDE_COMPLETED,
        vehicleType: VehicleType.CAB,
      }
    });
    completedRideId = completedRide.id;

    // 5. Create Active Ride (for testing rating state restrictions)
    const activeRide = await prisma.ride.create({
      data: {
        customerId: customerProfileId,
        driverId: driverProfileId,
        pickupAddress: 'Pickup Point',
        pickupLat: 12.97,
        pickupLng: 77.59,
        dropoffAddress: 'Dropoff Point',
        dropoffLat: 12.95,
        dropoffLng: 77.61,
        fare: 120.00,
        status: RideStatus.RIDE_STARTED,
        vehicleType: VehicleType.CAB,
      }
    });
    activeRideId = activeRide.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.rating.deleteMany({
      where: { rideId: { in: [completedRideId, activeRideId] } }
    });
    await prisma.ride.deleteMany({
      where: { id: { in: [completedRideId, activeRideId] } }
    });
    await prisma.vehicle.deleteMany({ where: { driverId: driverProfileId } });
    await prisma.driver.deleteMany({ where: { id: driverProfileId } });
    await prisma.customer.deleteMany({
      where: { id: { in: [customerProfileId, otherCustomerId] } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [customerId, otherCustomerId, driverId] } }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/customer/rides/:id/rating', () => {
    it('1. Customer can rate driver on completed ride', async () => {
      const res = await request(app)
        .post(`/api/customer/rides/${completedRideId}/rating`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          score: 5,
          comment: 'Excellent trip!'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.score).toBe(5);
      expect(res.body.data.comment).toBe('Excellent trip!');
      expect(res.body.data.raterRole).toBe(UserRole.CUSTOMER);
    }, 15000);

    it('2. Customer cannot submit duplicate rating for same ride', async () => {
      const res = await request(app)
        .post(`/api/customer/rides/${completedRideId}/rating`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          score: 4
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_RATING');
    });

    it('3. Rejects invalid score value ranges', async () => {
      const res = await request(app)
        .post(`/api/customer/rides/${completedRideId}/rating`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          score: 6 // invalid score (>5)
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('4. Rejects rating on non-completed active rides', async () => {
      const res = await request(app)
        .post(`/api/customer/rides/${activeRideId}/rating`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          score: 4
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATE');
    });

    it('5. Rejects rating request from non-owner customer', async () => {
      const res = await request(app)
        .post(`/api/customer/rides/${completedRideId}/rating`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({
          score: 5
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/driver/rides/:id/rating', () => {
    it('1. Driver can rate customer on completed ride', async () => {
      const res = await request(app)
        .post(`/api/driver/rides/${completedRideId}/rating`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          score: 4,
          comment: 'Very polite passenger.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.score).toBe(4);
      expect(res.body.data.raterRole).toBe(UserRole.DRIVER);
    });

    it('2. Rejects duplicate rating from driver', async () => {
      const res = await request(app)
        .post(`/api/driver/rides/${completedRideId}/rating`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          score: 3
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Averages Aggregates on Profile retrieval', () => {
    it('1. Returns correct average values inside customer profile', async () => {
      const res = await request(app)
        .get('/api/customer/profile')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.averageRating).toBe(4.0); // rated 4 by driver
      expect(res.body.data.totalRatings).toBe(1);
    });

    it('2. Returns correct average values inside driver profile', async () => {
      const res = await request(app)
        .get('/api/driver/profile')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.averageRating).toBe(5.0); // rated 5 by customer
      expect(res.body.data.totalRatings).toBe(1);
    });
  });
});
