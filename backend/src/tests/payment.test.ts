import request from 'supertest';
import { PrismaClient, UserRole, RideStatus, PaymentStatus, VehicleType } from '@prisma/client';
import app from '../app';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

describe('Stripe Payment Integration Tests', () => {
  let customerId: string;
  let customerProfileId: string;
  let customerToken: string;

  let driverId: string;
  let driverProfileId: string;
  let driverToken: string;

  let adminId: string;
  let adminToken: string;

  let testRideId: string;
  let testPaymentIntentId: string;

  beforeAll(async () => {
    // 1. Create Customer
    const customerUser = await prisma.user.create({
      data: {
        email: `cust-${Date.now()}@pay-test.com`,
        password: 'hashedPassword',
        role: UserRole.CUSTOMER,
        customer: { create: { phone: '+15559990001' } },
      },
      include: { customer: true },
    });
    customerId = customerUser.id;
    customerProfileId = customerUser.customer!.id;
    customerToken = generateToken({ userId: customerUser.id, role: customerUser.role });

    // 2. Create Driver
    const driverUser = await prisma.user.create({
      data: {
        email: `driv-${Date.now()}@pay-test.com`,
        password: 'hashedPassword',
        role: UserRole.DRIVER,
        driver: {
          create: {
            phone: '+15559990002',
            isApproved: true,
            status: 'ONLINE',
            vehicle: {
              create: {
                make: 'Chevrolet',
                model: 'Bolt',
                year: 2021,
                color: 'White',
                plateNumber: `PLT-PAY-${Date.now()}`,
                type: VehicleType.CAB,
              },
            },
            driverLocation: {
              create: { lat: 12.97, lng: 77.59 }
            }
          },
        },
      },
      include: { driver: true },
    });
    driverId = driverUser.id;
    driverProfileId = driverUser.driver!.id;
    driverToken = generateToken({ userId: driverUser.id, role: driverUser.role });

    // 3. Create Admin
    const adminUser = await prisma.user.create({
      data: {
        email: `admn-${Date.now()}@pay-test.com`,
        password: 'hashedPassword',
        role: UserRole.ADMIN
      }
    });
    adminId = adminUser.id;
    adminToken = generateToken({ userId: adminUser.id, role: adminUser.role });
  });

  afterAll(async () => {
    // Cleanup DB
    await prisma.rideStatusHistory.deleteMany({ where: { rideId: testRideId } });
    await prisma.payment.deleteMany({ where: { rideId: testRideId } });
    await prisma.ride.deleteMany({ where: { id: testRideId } });
    await prisma.vehicle.deleteMany({ where: { driverId: driverProfileId } });
    await prisma.driver.deleteMany({ where: { id: driverProfileId } });
    await prisma.customer.deleteMany({ where: { id: customerProfileId } });
    await prisma.user.deleteMany({ where: { id: { in: [customerId, driverId, adminId] } } });
    await prisma.$disconnect();
  });

  describe('Stripe Customer and Cards setup', () => {
    it('1. Generates SetupIntent client_secret successfully and creates customer', async () => {
      const res = await request(app)
        .post('/api/customer/payment-methods/setup')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.clientSecret).toBeDefined();

      // Check DB customer updated with Stripe customer ID
      const customer = await prisma.customer.findUnique({ where: { id: customerProfileId } });
      expect(customer?.stripeCustomerId).toBeDefined();
    }, 15000);

    it('2. Attaches mock payment method successfully', async () => {
      const res = await request(app)
        .post('/api/customer/payment-methods')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ paymentMethodId: 'pm_mock_visa' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('3. Lists attached payment methods successfully', async () => {
      const res = await request(app)
        .get('/api/customer/payment-methods')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].brand).toBe('visa');
    });
  });

  describe('Pre-Authorization hold on Ride Bookings', () => {
    it('1. Automatically requests pre-auth hold and creates payment record', async () => {
      const res = await request(app)
        .post('/api/customer/rides')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          pickupAddress: 'Start point',
          pickupLat: 12.97,
          pickupLng: 77.59,
          dropoffAddress: 'End point',
          dropoffLat: 12.93,
          dropoffLng: 77.62,
          vehicleType: 'CAB',
          paymentMethodId: 'pm_mock_visa'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      testRideId = res.body.data.id;

      // Verify payment holds record logged in DB
      const payment = await prisma.payment.findFirst({
        where: { rideId: testRideId }
      });

      expect(payment).toBeDefined();
      expect(payment?.status).toBe(PaymentStatus.AUTHORIZED);
      expect(payment?.provider).toBe('STRIPE');
      expect(payment?.transactionId).toBeDefined();
      testPaymentIntentId = payment!.transactionId!;
    });
  });

  describe('Capture Hold on Ride Completion', () => {
    it('1. Captures card hold successfully when driver marks ride completed', async () => {
      // Setup: Driver accepts ride
      await request(app)
        .patch(`/api/driver/rides/${testRideId}/accept`)
        .set('Authorization', `Bearer ${driverToken}`);

      // Driver transitions through states to started
      await request(app)
        .patch(`/api/driver/rides/${testRideId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'DRIVER_ARRIVING' });

      await request(app)
        .patch(`/api/driver/rides/${testRideId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'DRIVER_ARRIVED' });

      await request(app)
        .patch(`/api/driver/rides/${testRideId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'RIDE_STARTED' });

      // Driver completes ride
      const res = await request(app)
        .patch(`/api/driver/rides/${testRideId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'RIDE_COMPLETED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify DB payment status is COMPLETED
      const payment = await prisma.payment.findFirst({
        where: { rideId: testRideId }
      });
      expect(payment?.status).toBe(PaymentStatus.COMPLETED);
    }, 15000);
  });

  describe('Webhook Events handling', () => {
    it('1. Webhook updates db payment state successfully', async () => {
      // Make webhook event payload
      const payload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: testPaymentIntentId
          }
        }
      };

      // Reset payment status to AUTHORIZED to test webhook update
      const payRecord = await prisma.payment.findFirst({ where: { rideId: testRideId } });
      await prisma.payment.update({
        where: { id: payRecord!.id },
        data: { status: PaymentStatus.AUTHORIZED }
      });

      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'whsec_sig_mock')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);

      // Verify DB payment state updated by webhook to COMPLETED
      const updatedPay = await prisma.payment.findUnique({ where: { id: payRecord!.id } });
      expect(updatedPay?.status).toBe(PaymentStatus.COMPLETED);
    });

    it('2. Rejects webhook request with invalid signature header', async () => {
      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'invalid_sig')
        .send({ type: 'payment_intent.succeeded' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Payment API Endpoints (Phase 13)', () => {
    let secondCustomerId: string;
    let secondCustomerToken: string;
    let newRideId: string;
    let paymentId: string;

    beforeAll(async () => {
      // Create a second customer for ownership tests
      const user = await prisma.user.create({
        data: {
          email: `cust2-${Date.now()}@pay-test.com`,
          password: 'hashedPassword',
          role: UserRole.CUSTOMER,
          customer: { create: { phone: '+15559990003' } }
        }
      });
      secondCustomerId = user.id;
      secondCustomerToken = generateToken({ userId: user.id, role: user.role });

      // Create a new ride for the primary customer
      const ride = await prisma.ride.create({
        data: {
          customerId: customerProfileId,
          pickupAddress: 'Pickup',
          pickupLat: 12.97,
          pickupLng: 77.59,
          dropoffAddress: 'Dropoff',
          dropoffLat: 12.93,
          dropoffLng: 77.62,
          fare: 150.00,
          vehicleType: VehicleType.CAB,
          status: RideStatus.REQUESTED
        }
      });
      newRideId = ride.id;
    });

    afterAll(async () => {
      await prisma.payment.deleteMany({ where: { rideId: newRideId } });
      await prisma.rideStatusHistory.deleteMany({ where: { rideId: newRideId } });
      await prisma.ride.deleteMany({ where: { id: newRideId } });
      await prisma.customer.deleteMany({ where: { userId: secondCustomerId } });
      await prisma.user.deleteMany({ where: { id: secondCustomerId } });
    });

    it('1. Customer can create payment order for own ride', async () => {
      const res = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rideId: newRideId,
          paymentMethodId: 'pm_mock_visa'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.paymentId).toBeDefined();
      expect(res.body.data.amount).toBe(150.00);
      paymentId = res.body.data.paymentId;
    });

    it('2. Customer cannot create payment order for another customer\'s ride', async () => {
      const res = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${secondCustomerToken}`)
        .send({
          rideId: newRideId,
          paymentMethodId: 'pm_mock_visa'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('3. Driver cannot create payment orders', async () => {
      const res = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          rideId: newRideId,
          paymentMethodId: 'pm_mock_visa'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('4. Enforces duplicate active payment prevention', async () => {
      const res = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rideId: newRideId,
          paymentMethodId: 'pm_mock_visa'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('5. Customer can verify payment status successfully', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ paymentId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBeDefined();
    });

    it('6. Unauthorized customer is blocked from verifying payment status', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${secondCustomerToken}`)
        .send({ paymentId });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('7. Customer can inspect own payment details', async () => {
      const res = await request(app)
        .get(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(150.00);
    });

    it('8. Admin can view any payment details', async () => {
      const res = await request(app)
        .get(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('9. Unauthorized user cannot inspect other customer\'s payment details', async () => {
      const res = await request(app)
        .get(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${secondCustomerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
