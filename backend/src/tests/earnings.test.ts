import request from 'supertest';
import { PrismaClient, UserRole, RideStatus, VehicleType, PaymentStatus } from '@prisma/client';
import app from '../app';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

describe('Driver Earnings Tracking Integration Tests', () => {
  let driverUserId: string;
  let driverProfileId: string;
  let driverToken: string;

  let otherDriverUserId: string;
  let otherDriverProfileId: string;
  let otherDriverToken: string;

  let customerUserId: string;
  let customerProfileId: string;
  let customerToken: string;

  let completedPaidRideId: string;
  let completedUnpaidRideId: string;
  let activeRideId: string;

  beforeAll(async () => {
    // 1. Create Customer
    const customerUser = await prisma.user.create({
      data: {
        email: `cust-${Date.now()}@earning-test.com`,
        password: 'hashedPassword',
        role: UserRole.CUSTOMER,
        customer: { create: { phone: '+15559990001' } },
      },
      include: { customer: true },
    });
    customerUserId = customerUser.id;
    customerProfileId = customerUser.customer!.id;
    customerToken = generateToken({ userId: customerUser.id, role: customerUser.role });

    // 2. Create Target Driver
    const driverUser = await prisma.user.create({
      data: {
        email: `driv-${Date.now()}@earning-test.com`,
        password: 'hashedPassword',
        role: UserRole.DRIVER,
        driver: {
          create: {
            phone: '+15559990002',
            isApproved: true,
            status: 'ONLINE',
            vehicle: {
              create: {
                make: 'Toyota',
                model: 'Prius',
                year: 2021,
                color: 'White',
                plateNumber: `PLT-EARN-${Date.now()}`,
                type: VehicleType.CAB,
              },
            },
          },
        },
      },
      include: { driver: true },
    });
    driverUserId = driverUser.id;
    driverProfileId = driverUser.driver!.id;
    driverToken = generateToken({ userId: driverUser.id, role: driverUser.role });

    // 3. Create Other Driver (for privacy checks)
    const otherDriverUser = await prisma.user.create({
      data: {
        email: `driv-other-${Date.now()}@earning-test.com`,
        password: 'hashedPassword',
        role: UserRole.DRIVER,
        driver: {
          create: {
            phone: '+15559990003',
            isApproved: true,
            status: 'ONLINE',
            vehicle: {
              create: {
                make: 'Honda',
                model: 'Civic',
                year: 2020,
                color: 'Grey',
                plateNumber: `PLT-OTHR-${Date.now()}`,
                type: VehicleType.CAB,
              },
            },
          },
        },
      },
      include: { driver: true },
    });
    otherDriverUserId = otherDriverUser.id;
    otherDriverProfileId = otherDriverUser.driver!.id;
    otherDriverToken = generateToken({ userId: otherDriverUser.id, role: otherDriverUser.role });

    // 4. Create Completed & Paid Ride (Should be counted in earnings)
    const completedPaidRide = await prisma.ride.create({
      data: {
        customerId: customerUser.customer!.id,
        driverId: driverProfileId,
        pickupAddress: 'Pickup One',
        pickupLat: 12.97,
        pickupLng: 77.59,
        dropoffAddress: 'Dropoff One',
        dropoffLat: 12.95,
        dropoffLng: 77.61,
        fare: 100.00,
        status: RideStatus.RIDE_COMPLETED,
        vehicleType: VehicleType.CAB,
        payments: {
          create: {
            amount: 100.00,
            status: PaymentStatus.COMPLETED,
            provider: 'MOCK',
            transactionId: `tx-paid-${Date.now()}`
          }
        }
      }
    });
    completedPaidRideId = completedPaidRide.id;

    // 5. Create Completed & Unpaid/Pending Ride (Should NOT be counted)
    const completedUnpaidRide = await prisma.ride.create({
      data: {
        customerId: customerUser.customer!.id,
        driverId: driverProfileId,
        pickupAddress: 'Pickup Two',
        pickupLat: 12.97,
        pickupLng: 77.59,
        dropoffAddress: 'Dropoff Two',
        dropoffLat: 12.95,
        dropoffLng: 77.61,
        fare: 50.00,
        status: RideStatus.RIDE_COMPLETED,
        vehicleType: VehicleType.CAB,
        payments: {
          create: {
            amount: 50.00,
            status: PaymentStatus.FAILED,
            provider: 'MOCK',
            transactionId: `tx-failed-${Date.now()}`
          }
        }
      }
    });
    completedUnpaidRideId = completedUnpaidRide.id;

    // 6. Create Active/Uncompleted Ride (Should NOT be counted)
    const activeRide = await prisma.ride.create({
      data: {
        customerId: customerUser.customer!.id,
        driverId: driverProfileId,
        pickupAddress: 'Pickup Three',
        pickupLat: 12.97,
        pickupLng: 77.59,
        dropoffAddress: 'Dropoff Three',
        dropoffLat: 12.95,
        dropoffLng: 77.61,
        fare: 80.00,
        status: RideStatus.RIDE_STARTED,
        vehicleType: VehicleType.CAB,
      }
    });
    activeRideId = activeRide.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.payment.deleteMany({
      where: { rideId: { in: [completedPaidRideId, completedUnpaidRideId, activeRideId] } }
    });
    await prisma.ride.deleteMany({
      where: { id: { in: [completedPaidRideId, completedUnpaidRideId, activeRideId] } }
    });
    await prisma.vehicle.deleteMany({
      where: { driverId: { in: [driverProfileId, otherDriverProfileId] } }
    });
    await prisma.driver.deleteMany({
      where: { id: { in: [driverProfileId, otherDriverProfileId] } }
    });
    await prisma.customer.deleteMany({
      where: { userId: customerUserId }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [customerUserId, driverUserId, otherDriverUserId] } }
    });
    await prisma.$disconnect();
  });

  describe('GET /api/driver/earnings', () => {
    it('1. Rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/driver/earnings');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('2. Rejects requests from non-driver roles with 403', async () => {
      const res = await request(app)
        .get('/api/driver/earnings')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('3. Driver can retrieve their own earnings successfully', async () => {
      const res = await request(app)
        .get('/api/driver/earnings')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.commissionRate).toBe(0.80);
      
      // Expected total: 100 * 0.80 = 80.00. Unpaid and active rides should be excluded.
      expect(data.totalEarnings).toBe(80.00);
      expect(data.dailyEarnings).toBe(80.00);
      expect(data.weeklyEarnings).toBe(80.00);

      expect(data.history).toHaveLength(1);
      expect(data.history[0].fare).toBe(100.00);
      expect(data.history[0].driverShare).toBe(80.00);
    });

    it('4. Asserts driver queries are isolated to their own records', async () => {
      // Create a completed, paid ride for other driver
      const otherRide = await prisma.ride.create({
        data: {
          customerId: customerProfileId,
          driverId: otherDriverProfileId,
          pickupAddress: 'Other Location',
          pickupLat: 12.97,
          pickupLng: 77.59,
          dropoffAddress: 'Other Dest',
          dropoffLat: 12.95,
          dropoffLng: 77.61,
          fare: 200.00,
          status: RideStatus.RIDE_COMPLETED,
          vehicleType: VehicleType.CAB,
          payments: {
            create: {
              amount: 200.00,
              status: PaymentStatus.COMPLETED,
              provider: 'MOCK',
              transactionId: `tx-other-${Date.now()}`
            }
          }
        }
      });

      const res = await request(app)
        .get('/api/driver/earnings')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      // Cumulative driver share should still remain 80.00 (excludes the other driver's 160.00 share)
      expect(res.body.data.totalEarnings).toBe(80.00);

      // Clean up the temporary other ride
      await prisma.payment.deleteMany({ where: { rideId: otherRide.id } });
      await prisma.ride.delete({ where: { id: otherRide.id } });
    });
  });

  describe('GET /api/admin/drivers integration', () => {
    it('1. Admin getDrivers endpoint lists driver total earnings correctly', async () => {
      // Create admin token
      const adminUser = await prisma.user.create({
        data: {
          email: `admin-${Date.now()}@earning-test.com`,
          password: 'hashedPassword',
          role: UserRole.ADMIN,
        }
      });
      const adminToken = generateToken({ userId: adminUser.id, role: adminUser.role });

      const res = await request(app)
        .get('/api/admin/drivers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const targetDriver = res.body.data.find((d: any) => d.id === driverProfileId);
      expect(targetDriver).toBeDefined();
      expect(targetDriver.totalEarnings).toBe(80.00);

      // Clean up admin
      await prisma.user.delete({ where: { id: adminUser.id } });
    });
  });
});
