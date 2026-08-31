import request from 'supertest';
import { PrismaClient, UserRole, RideStatus, PaymentStatus, VehicleType } from '@prisma/client';
import app from '../app';
import { generateToken } from '../utils/jwt';
import { PaymentService } from '../services/payment.service';

const prisma = new PrismaClient();

describe('Phase 16 — Production Readiness & E2E Validation Tests', () => {
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

  let rideId: string;
  let paymentId: string;
  let transactionId: string;

  beforeAll(async () => {
    // 1. Setup Customer A
    const userA = await prisma.user.create({
      data: {
        email: `cust-a-${Date.now()}@p16-test.com`,
        password: 'hashedPassword',
        role: UserRole.CUSTOMER,
        customer: { create: { phone: '+919000000001', stripeCustomerId: 'cus_mock_cust_a_p16' } }
      },
      include: { customer: true }
    });
    customerAId = userA.id;
    customerAProfileId = userA.customer!.id;
    customerAToken = generateToken({ userId: userA.id, role: userA.role });

    // 2. Setup Customer B
    const userB = await prisma.user.create({
      data: {
        email: `cust-b-${Date.now()}@p16-test.com`,
        password: 'hashedPassword',
        role: UserRole.CUSTOMER,
        customer: { create: { phone: '+919000000002', stripeCustomerId: 'cus_mock_cust_b_p16' } }
      },
      include: { customer: true }
    });
    customerBId = userB.id;
    customerBProfileId = userB.customer!.id;
    customerBToken = generateToken({ userId: userB.id, role: userB.role });

    // 3. Setup Driver
    const userDriver = await prisma.user.create({
      data: {
        email: `driv-${Date.now()}@p16-test.com`,
        password: 'hashedPassword',
        role: UserRole.DRIVER,
        driver: {
          create: {
            phone: '+919000000003',
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

    // 4. Setup Admin
    const userAdmin = await prisma.user.create({
      data: {
        email: `admn-${Date.now()}@p16-test.com`,
        password: 'hashedPassword',
        role: UserRole.ADMIN
      }
    });
    adminId = userAdmin.id;
    adminToken = generateToken({ userId: userAdmin.id, role: userAdmin.role });

    // 5. Setup Ride
    const ride = await prisma.ride.create({
      data: {
        customerId: customerAProfileId,
        pickupAddress: 'Start point',
        pickupLat: 12.97,
        pickupLng: 77.59,
        dropoffAddress: 'End point',
        dropoffLat: 12.93,
        dropoffLng: 77.62,
        fare: 300.00,
        vehicleType: VehicleType.CAB,
        status: RideStatus.REQUESTED
      }
    });
    rideId = ride.id;
  });

  afterAll(async () => {
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

  describe('Ride & Payment E2E flow', () => {
    it('1. Should ignore client-supplied fare and charge database authoritative fare (₹300)', async () => {
      const res = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          rideId,
          paymentMethodId: 'pm_mock_visa',
          amount: 5.00 // Client attempts to manipulate fare to 5 Rupees
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(300.00); // Verify server-side fare enforcement
      paymentId = res.body.data.paymentId;
      transactionId = res.body.data.transactionId;
    });

    it('2. Customer B should be forbidden from paying for Customer A\'s ride', async () => {
      const res = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${customerBToken}`)
        .send({
          rideId,
          paymentMethodId: 'pm_mock_visa'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('3. Driver cannot call customer payments creation API', async () => {
      const res = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          rideId,
          paymentMethodId: 'pm_mock_visa'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('4. Block duplicate active payment order creations', async () => {
      const res = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          rideId,
          paymentMethodId: 'pm_mock_visa'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('5. Webhook updates database payment to AUTHORIZED', async () => {
      const payload = {
        type: 'payment_intent.amount_capturable_updated',
        data: { object: { id: transactionId } }
      };

      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'whsec_sig_mock')
        .send(payload);

      expect(res.status).toBe(200);

      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(payment?.status).toBe(PaymentStatus.AUTHORIZED);

      const ride = await prisma.ride.findUnique({ where: { id: rideId } });
      expect(ride?.status).toBe(RideStatus.SEARCHING_DRIVER);
    });

    it('6. Driver accepts ride request', async () => {
      const res = await request(app)
        .patch(`/api/driver/rides/${rideId}/accept`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const ride = await prisma.ride.findUnique({ where: { id: rideId } });
      expect(ride?.status).toBe(RideStatus.DRIVER_ASSIGNED);
      expect(ride?.driverId).toBe(driverProfileId);
    });

    it('7. Driver completes ride (triggers hold capture)', async () => {
      // Driver transitions through intermediate states
      await request(app)
        .patch(`/api/driver/rides/${rideId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'DRIVER_ARRIVING' });

      await request(app)
        .patch(`/api/driver/rides/${rideId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'DRIVER_ARRIVED' });

      await request(app)
        .patch(`/api/driver/rides/${rideId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'RIDE_STARTED' });

      // Driver completes ride
      const res = await request(app)
        .patch(`/api/driver/rides/${rideId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'RIDE_COMPLETED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify payment was marked COMPLETED automatically by hold capture call
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(payment?.status).toBe(PaymentStatus.COMPLETED);

      const ride = await prisma.ride.findUnique({ where: { id: rideId } });
      expect(ride?.status).toBe(RideStatus.RIDE_COMPLETED);
    });

    it('8. Duplicate webhook should be safe and idempotent', async () => {
      const payload = {
        type: 'payment_intent.succeeded',
        data: { object: { id: transactionId } }
      };

      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'whsec_sig_mock')
        .send(payload);

      expect(res.status).toBe(200);

      // Verify payment count remains 1
      const count = await prisma.payment.count({ where: { rideId } });
      expect(count).toBe(1);

      // Verify status remains COMPLETED
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(payment?.status).toBe(PaymentStatus.COMPLETED);
    });

    it('9. Webhook signature checking blocks invalid signatures', async () => {
      const payload = {
        type: 'payment_intent.succeeded',
        data: { object: { id: transactionId } }
      };

      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'invalid_sig')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('10. Reject invalid token signatures with HTTP 401', async () => {
      const res = await request(app)
        .get(`/api/payments/${paymentId}`)
        .set('Authorization', 'Bearer invalid_token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('11. Block unauthorized admin endpoint query for customer token', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
