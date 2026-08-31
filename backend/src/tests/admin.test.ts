import request from 'supertest';
import { PrismaClient, UserRole, RideStatus, VehicleType } from '@prisma/client';
import app from '../app';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

describe('Admin Backend APIs Integration Tests', () => {
  let adminId: string;
  let adminToken: string;

  let customerId: string;
  let customerProfileId: string;
  let customerToken: string;

  let driverId: string;
  let driverProfileId: string;
  let driverToken: string;

  let testRideId: string;

  beforeAll(async () => {
    // 1. Create Admin
    const adminUser = await prisma.user.create({
      data: {
        email: `admin-${Date.now()}@admin-test.com`,
        password: 'hashedPassword',
        role: UserRole.ADMIN,
      },
    });
    adminId = adminUser.id;
    adminToken = generateToken({ userId: adminUser.id, role: adminUser.role });

    // 2. Create Customer
    const customerUser = await prisma.user.create({
      data: {
        email: `cust-${Date.now()}@admin-test.com`,
        password: 'hashedPassword',
        role: UserRole.CUSTOMER,
        customer: { create: { phone: '+14449990001' } },
      },
      include: { customer: true },
    });
    customerId = customerUser.id;
    customerProfileId = customerUser.customer!.id;
    customerToken = generateToken({ userId: customerUser.id, role: customerUser.role });

    // 3. Create Driver
    const driverUser = await prisma.user.create({
      data: {
        email: `driv-${Date.now()}@admin-test.com`,
        password: 'hashedPassword',
        role: UserRole.DRIVER,
        driver: {
          create: {
            phone: '+14449990002',
            isApproved: false,
            status: 'OFFLINE',
            vehicle: {
              create: {
                make: 'Nissan',
                model: 'Leaf',
                year: 2019,
                color: 'Blue',
                plateNumber: `PLT-ADM-${Date.now()}`,
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

    // 4. Create Ride
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
        status: RideStatus.RIDE_COMPLETED,
      },
    });
    testRideId = ride.id;
  });

  afterAll(async () => {
    // Cleanup DB - must delete in dependency order (children before parents)
    await prisma.rideStatusHistory.deleteMany({ where: { rideId: testRideId } });
    await prisma.ride.deleteMany({ where: { id: testRideId } });
    await prisma.vehicle.deleteMany({ where: { driverId: driverProfileId } });
    await prisma.driver.deleteMany({ where: { id: driverProfileId } });
    await prisma.customer.deleteMany({ where: { id: customerProfileId } });
    // Delete audit logs tied to adminStaff before deleting users
    const adminStaff = await prisma.adminStaff.findUnique({ where: { userId: adminId } });
    if (adminStaff) {
      await prisma.auditLog.deleteMany({ where: { actorId: adminStaff.id } });
      await prisma.adminStaff.delete({ where: { id: adminStaff.id } });
    }
    await prisma.user.deleteMany({ where: { id: { in: [adminId, customerId, driverId] } } });
    await prisma.$disconnect();
  });

  describe('Admin Authorization checks', () => {
    it('1. Rejects access to GET /api/admin/stats for CUSTOMER role', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('2. Rejects access to GET /api/admin/stats for DRIVER role', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('3. Allows access to GET /api/admin/stats for ADMIN role', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalUsers).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Driver Approvals & Suspension Management', () => {
    it('1. Admin approves driver successfully, shifting isApproved flag to true', async () => {
      const res = await request(app)
        .patch(`/api/admin/drivers/${driverProfileId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isApproved).toBe(true);

      const dbDriver = await prisma.driver.findUnique({ where: { id: driverProfileId } });
      expect(dbDriver?.isApproved).toBe(true);
    });

    it('2. Admin suspends/rejects driver successfully, shifting isApproved flag back to false', async () => {
      const res = await request(app)
        .patch(`/api/admin/drivers/${driverProfileId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isApproved).toBe(false);

      const dbDriver = await prisma.driver.findUnique({ where: { id: driverProfileId } });
      expect(dbDriver?.isApproved).toBe(false);
    });
  });

  describe('Pricing Config Controls', () => {
    it('1. Admin updates vehicle type pricing options successfully', async () => {
      const res = await request(app)
        .put('/api/admin/pricing/CAB')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          baseFare: 6.0,
          perKmRate: 2.0,
          perMinuteRate: 0.3,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.baseFare).toBe(6.0);
      expect(res.body.data.perKmRate).toBe(2.0);
    });

    it('2. Rejects request with negative pricing values', async () => {
      const res = await request(app)
        .put('/api/admin/pricing/CAB')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          baseFare: -1.0, // Invalid negative fare
          perKmRate: 2.0,
          perMinuteRate: 0.3,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Ride Monitoring & Inspection', () => {
    it('1. Admin lists all rides', async () => {
      const res = await request(app)
        .get('/api/admin/rides')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('2. Admin retrieves specific ride details successfully', async () => {
      const res = await request(app)
        .get(`/api/admin/rides/${testRideId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testRideId);
      expect(res.body.data.status).toBe(RideStatus.RIDE_COMPLETED);
    });
  });
});
