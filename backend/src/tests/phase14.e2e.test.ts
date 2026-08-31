import request from 'supertest';
import { PrismaClient, UserRole, RideStatus, PaymentStatus, VehicleType } from '@prisma/client';
import app from '../app';
import { generateToken } from '../utils/jwt';
import { PaymentService } from '../services/payment.service';

const prisma = new PrismaClient();

describe('Phase 14 — Production Readiness & E2E Payment Integration Tests', () => {
  // Test user IDs
  let customerAId: string;
  let customerAToken: string;
  let customerAProfileId: string;

  let customerBId: string;
  let customerBToken: string;
  let customerBProfileId: string;

  let driverId: string;
  let driverToken: string;
  let driverProfileId: string;

  let adminId: string;
  let adminToken: string;

  // Test ride & payment records
  let rideId: string;
  let paymentId: string;
  let transactionId: string;

  beforeAll(async () => {
    // 1. Create Customer A
    const userA = await prisma.user.create({
      data: {
        email: `cust-a-${Date.now()}@p14-test.com`,
        password: 'hashedPassword',
        role: UserRole.CUSTOMER,
        customer: { create: { phone: '+919999000001', stripeCustomerId: 'cus_mock_cust_a' } }
      },
      include: { customer: true }
    });
    customerAId = userA.id;
    customerAProfileId = userA.customer!.id;
    customerAToken = generateToken({ userId: userA.id, role: userA.role });

    // 2. Create Customer B
    const userB = await prisma.user.create({
      data: {
        email: `cust-b-${Date.now()}@p14-test.com`,
        password: 'hashedPassword',
        role: UserRole.CUSTOMER,
        customer: { create: { phone: '+919999000002', stripeCustomerId: 'cus_mock_cust_b' } }
      },
      include: { customer: true }
    });
    customerBId = userB.id;
    customerBProfileId = userB.customer!.id;
    customerBToken = generateToken({ userId: userB.id, role: userB.role });

    // 3. Create Driver
    const userDriver = await prisma.user.create({
      data: {
        email: `driv-${Date.now()}@p14-test.com`,
        password: 'hashedPassword',
        role: UserRole.DRIVER,
        driver: {
          create: {
            phone: '+919999000003',
            name: 'Rajesh Kumar',
            licenseNumber: 'DL1420110068222',
            isApproved: true,
            status: 'ONLINE',
            vehicle: {
              create: {
                make: 'Maruti',
                model: 'Dzire',
                year: 2022,
                color: 'White',
                plateNumber: 'KA03MY1234',
                type: VehicleType.CAB
              }
            },
            driverLocation: {
              create: { lat: 12.97, lng: 77.59 }
            }
          }
        }
      },
      include: { driver: true }
    });
    driverId = userDriver.id;
    driverProfileId = userDriver.driver!.id;
    driverToken = generateToken({ userId: userDriver.id, role: userDriver.role });

    // 4. Create Admin
    const userAdmin = await prisma.user.create({
      data: {
        email: `admn-${Date.now()}@p14-test.com`,
        password: 'hashedPassword',
        role: UserRole.ADMIN
      }
    });
    adminId = userAdmin.id;
    adminToken = generateToken({ userId: userAdmin.id, role: userAdmin.role });

    // 5. Create a test ride for Customer A
    const ride = await prisma.ride.create({
      data: {
        customerId: customerAProfileId,
        pickupAddress: 'Start point',
        pickupLat: 12.97,
        pickupLng: 77.59,
        dropoffAddress: 'End point',
        dropoffLat: 12.93,
        dropoffLng: 77.62,
        fare: 250.00,
        vehicleType: VehicleType.CAB,
        status: RideStatus.REQUESTED
      }
    });
    rideId = ride.id;
  });

  afterAll(async () => {
    // Delete test records
    await prisma.payment.deleteMany({ where: { rideId: { in: [rideId] } } });
    await prisma.rideStatusHistory.deleteMany({ where: { rideId: { in: [rideId] } } });
    await prisma.ride.deleteMany({ where: { id: { in: [rideId] } } });
    await prisma.vehicle.deleteMany({ where: { driverId: driverProfileId } });
    await prisma.driverLocation.deleteMany({ where: { driverId: driverProfileId } });
    await prisma.driver.deleteMany({ where: { id: driverProfileId } });
    await prisma.customer.deleteMany({ where: { id: { in: [customerAProfileId, customerBProfileId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [customerAId, customerBId, driverId, adminId] } } });
    await prisma.$disconnect();
  });

  describe('1. Server-Side Fare Calculation Verification (Step 4)', () => {
    it('should ignore client-supplied fare when creating order and use database fare (₹250)', async () => {
      const res = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          rideId,
          paymentMethodId: 'pm_mock_visa',
          amount: 10.00 // Client attempts to manipulate amount to 10 Rupees
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(250.00); // Verify server charged the correct fare from DB
      paymentId = res.body.data.paymentId;
      transactionId = res.body.data.transactionId;
    });
  });

  describe('2. Ownership & Authorization Checks (Step 5 & 10)', () => {
    it('Customer B should be blocked from creating payment on Customer A\'s ride', async () => {
      const res = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${customerBToken}`)
        .send({
          rideId,
          paymentMethodId: 'pm_mock_visa'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Customer B should be blocked from verifying Customer A\'s payment status', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${customerBToken}`)
        .send({ paymentId });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Customer B should be blocked from querying Customer A\'s payment detail cards', async () => {
      const res = await request(app)
        .get(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${customerBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Driver Rajesh should be blocked from calling payment endpoints', async () => {
      const resOrder = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ rideId, paymentMethodId: 'pm_mock_visa' });
      expect(resOrder.status).toBe(403);

      const resVerify = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ paymentId });
      expect(resVerify.status).toBe(403);
    });

    it('Admin should be permitted to retrieve payment details', async () => {
      const res = await request(app)
        .get(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(250.00);
    });
  });

  describe('3. Webhook Signature & Security (Step 8)', () => {
    it('should reject webhook updates carrying invalid signatures', async () => {
      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'invalid_sig')
        .send({
          type: 'payment_intent.succeeded',
          data: { object: { id: transactionId } }
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Webhook Idempotency & Out-of-Order Webhooks (Step 8 & 9)', () => {
    it('should be safe and idempotent when processing duplicate events', async () => {
      // Simulate Stripe succeeded webhook
      const payload = {
        type: 'payment_intent.succeeded',
        data: { object: { id: transactionId } }
      };

      // Webhook call #1
      const res1 = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'whsec_sig_mock')
        .send(payload);
      expect(res1.status).toBe(200);

      const paymentRecord1 = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(paymentRecord1?.status).toBe(PaymentStatus.COMPLETED);

      // Webhook call #2 (duplicate)
      const res2 = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'whsec_sig_mock')
        .send(payload);
      expect(res2.status).toBe(200);

      // Verify payment status has NOT regressed or created duplicates
      const count = await prisma.payment.count({ where: { rideId } });
      expect(count).toBe(1);

      const paymentRecord2 = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(paymentRecord2?.status).toBe(PaymentStatus.COMPLETED);
    });

    it('should reject out-of-order updates after payment is completed', async () => {
      // Send amount_capturable_updated (authorization event) after payment is already completed
      const payload = {
        type: 'payment_intent.amount_capturable_updated',
        data: { object: { id: transactionId } }
      };

      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'whsec_sig_mock')
        .send(payload);

      // Handler returns 500/400 because transition COMPLETED -> AUTHORIZED is invalid
      expect(res.status).toBe(500);

      // Verify status remains COMPLETED
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(payment?.status).toBe(PaymentStatus.COMPLETED);
    });
  });

  describe('5. Payment State Machine Transition Rules (Step 3)', () => {
    it('should reject invalid transition COMPLETED -> PENDING via direct service calls', async () => {
      await expect(
        PaymentService.updatePaymentStatus(paymentId, PaymentStatus.PENDING)
      ).rejects.toThrow('INVALID_PAYMENT_TRANSITION');
    });

    it('should reject invalid transition COMPLETED -> AUTHORIZED via direct service calls', async () => {
      await expect(
        PaymentService.updatePaymentStatus(paymentId, PaymentStatus.AUTHORIZED)
      ).rejects.toThrow('INVALID_PAYMENT_TRANSITION');
    });
  });
});
