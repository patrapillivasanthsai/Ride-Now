import request from 'supertest';
import { PrismaClient, UserRole } from '@prisma/client';
import app from '../app';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

describe('Customer API Integration Tests', () => {
  const customerEmail = `cust-${Date.now()}@example.com`;
  const driverEmail = `driv-${Date.now()}@example.com`;
  const otherCustomerEmail = `other-${Date.now()}@example.com`;
  const password = 'testPassword123';

  let customerId: string;
  let customerProfileId: string;
  let customerToken: string;

  let otherCustomerProfileId: string;
  let otherCustomerToken: string;

  let driverToken: string;
  let testRideId: string;

  beforeAll(async () => {
    // 1. Create Test Customer
    const customerUser = await prisma.user.create({
      data: {
        email: customerEmail,
        password: 'hashedPasswordPlaceholder',
        role: UserRole.CUSTOMER,
        customer: {
          create: {
            phone: '+15559876543',
          },
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
          create: {
            phone: '+15550009999',
          },
        },
      },
      include: { customer: true },
    });
    otherCustomerProfileId = otherUser.customer!.id;
    otherCustomerToken = generateToken({ userId: otherUser.id, role: otherUser.role });

    // 3. Create a Driver
    const driverUser = await prisma.user.create({
      data: {
        email: driverEmail,
        password: 'hashedPasswordPlaceholder',
        role: UserRole.DRIVER,
        driver: {
          create: {
            phone: '+15556667777',
          },
        },
      },
    });
    driverToken = generateToken({ userId: driverUser.id, role: driverUser.role });

    // 4. Create a Ride belonging to our test customer
    const ride = await prisma.ride.create({
      data: {
        customerId: customerProfileId,
        pickupAddress: 'Start point',
        pickupLat: 12.9,
        pickupLng: 77.5,
        dropoffAddress: 'End point',
        dropoffLat: 12.95,
        dropoffLng: 77.55,
        fare: 150.0,
      },
    });
    testRideId = ride.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.ride.deleteMany({
      where: { customerId: { in: [customerProfileId, otherCustomerProfileId] } },
    });
    await prisma.customer.deleteMany({
      where: { id: { in: [customerProfileId, otherCustomerProfileId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [customerId, otherCustomerProfileId] } },
    });
    await prisma.$disconnect();
  });

  describe('GET /api/customer/profile', () => {
    it('1. Retrieves profile details successfully for authorized customer', async () => {
      const res = await request(app)
        .get('/api/customer/profile')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(customerEmail);
      expect(res.body.data.phone).toBe('+15559876543');
    });

    it('2. Driver is forbidden from accessing customer profile route', async () => {
      const res = await request(app)
        .get('/api/customer/profile')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('PUT /api/customer/profile', () => {
    it('1. Updates customer profile information successfully', async () => {
      const newPhone = '+15559998888';
      const newEmail = `updated-cust-${Date.now()}@example.com`;

      const res = await request(app)
        .put('/api/customer/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          phone: newPhone,
          email: newEmail,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phone).toBe(newPhone);
      expect(res.body.data.email).toBe(newEmail);

      // Verify in DB
      const updatedUser = await prisma.user.findUnique({
        where: { id: customerId },
        include: { customer: true },
      });
      expect(updatedUser?.email).toBe(newEmail);
      expect(updatedUser?.customer?.phone).toBe(newPhone);
    });

    it('2. Rejects invalid inputs (e.g. short password)', async () => {
      const res = await request(app)
        .put('/api/customer/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          password: '123', // Too short
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/customer/rides', () => {
    it('1. Returns list of rides for the customer', async () => {
      const res = await request(app)
        .get('/api/customer/rides')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].id).toBe(testRideId);
    });
  });

  describe('GET /api/customer/rides/:id', () => {
    it('1. Returns ride detail for authorized owner customer', async () => {
      const res = await request(app)
        .get(`/api/customer/rides/${testRideId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testRideId);
      expect(res.body.data.pickupAddress).toBe('Start point');
    });

    it('2. Denies access to another customer trying to view the ride', async () => {
      const res = await request(app)
        .get(`/api/customer/rides/${testRideId}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
