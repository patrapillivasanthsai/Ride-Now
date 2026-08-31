import request from 'supertest';
import { PrismaClient, UserRole, DriverStatus, VehicleType } from '@prisma/client';
import app from '../app';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

describe('Driver API Integration Tests', () => {
  const driverEmail = `driv-${Date.now()}@example.com`;
  const customerEmail = `cust-${Date.now()}@example.com`;
  const otherDriverEmail = `other-driv-${Date.now()}@example.com`;
  const password = 'testPassword123';

  let driverId: string;
  let driverProfileId: string;
  let driverToken: string;

  let otherDriverProfileId: string;
  let otherDriverToken: string;

  let customerToken: string;
  let customerProfileId: string;
  let testRideId: string;

  beforeAll(async () => {
    // 1. Create Test Customer (for booking reference)
    const customerUser = await prisma.user.create({
      data: {
        email: customerEmail,
        password: 'hashedPasswordPlaceholder',
        role: UserRole.CUSTOMER,
        customer: {
          create: {
            phone: '+15558887777',
          },
        },
      },
      include: { customer: true },
    });
    customerProfileId = customerUser.customer!.id;
    customerToken = generateToken({ userId: customerUser.id, role: customerUser.role });

    // 2. Create Test Driver with Vehicle
    const driverUser = await prisma.user.create({
      data: {
        email: driverEmail,
        password: 'hashedPasswordPlaceholder',
        role: UserRole.DRIVER,
        driver: {
          create: {
            phone: '+15551112222',
            vehicle: {
              create: {
                make: 'Toyota',
                model: 'Prius',
                year: 2020,
                color: 'White',
                plateNumber: `PLT-${Date.now()}`,
                type: VehicleType.CAB,
              },
            },
          },
        },
      },
      include: {
        driver: { include: { vehicle: true } },
      },
    });
    driverId = driverUser.id;
    driverProfileId = driverUser.driver!.id;
    driverToken = generateToken({ userId: driverUser.id, role: driverUser.role });

    // 3. Create another Driver (for ownership/duplicate plate checks)
    const otherDriverUser = await prisma.user.create({
      data: {
        email: otherDriverEmail,
        password: 'hashedPasswordPlaceholder',
        role: UserRole.DRIVER,
        driver: {
          create: {
            phone: '+15553334444',
            vehicle: {
              create: {
                make: 'Nissan',
                model: 'Leaf',
                year: 2019,
                color: 'Black',
                plateNumber: `PLT-OTH-${Date.now()}`,
                type: VehicleType.AUTO,
              },
            },
          },
        },
      },
      include: { driver: true },
    });
    otherDriverProfileId = otherDriverUser.driver!.id;
    otherDriverToken = generateToken({ userId: otherDriverUser.id, role: otherDriverUser.role });

    // 4. Create a Ride assigned to our test driver
    const ride = await prisma.ride.create({
      data: {
        customerId: customerProfileId,
        driverId: driverProfileId,
        pickupAddress: 'Start location',
        pickupLat: 12.9,
        pickupLng: 77.5,
        dropoffAddress: 'End location',
        dropoffLat: 12.95,
        dropoffLng: 77.55,
        fare: 200.0,
        status: 'DRIVER_ASSIGNED',
      },
    });
    testRideId = ride.id;
  });

  afterAll(async () => {
    // Clean up DB
    await prisma.driverLocation.deleteMany({
      where: { driverId: { in: [driverProfileId, otherDriverProfileId] } },
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
      where: { id: { in: [driverId, otherDriverProfileId, customerProfileId] } },
    });
    await prisma.$disconnect();
  });

  describe('GET /api/driver/profile', () => {
    it('1. Retrieves driver profile and vehicle details successfully', async () => {
      const res = await request(app)
        .get('/api/driver/profile')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(driverEmail);
      expect(res.body.data.vehicle).toHaveProperty('id');
      expect(res.body.data.vehicle.make).toBe('Toyota');
    });

    it('2. Customer is forbidden from accessing driver profile route', async () => {
      const res = await request(app)
        .get('/api/driver/profile')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('PUT /api/driver/profile', () => {
    it('1. Updates status and phone successfully', async () => {
      const res = await request(app)
        .put('/api/driver/profile')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          status: DriverStatus.ONLINE,
          phone: '+15550001111',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ONLINE');
      expect(res.body.data.phone).toBe('+15550001111');

      // Verify in DB
      const dbDriver = await prisma.driver.findUnique({ where: { id: driverProfileId } });
      expect(dbDriver?.status).toBe('ONLINE');
      expect(dbDriver?.phone).toBe('+15550001111');
    });

    it('2. Rejects invalid status state', async () => {
      const res = await request(app)
        .put('/api/driver/profile')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          status: 'INVALID_STATUS',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/driver/vehicle', () => {
    it('1. Updates driver vehicle info successfully', async () => {
      const newPlate = `NEW-PLT-${Date.now()}`;
      const res = await request(app)
        .put('/api/driver/vehicle')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          make: 'Tesla',
          model: 'Model 3',
          year: 2023,
          color: 'Red',
          plateNumber: newPlate,
          type: VehicleType.CAB,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.make).toBe('Tesla');
      expect(res.body.data.plateNumber).toBe(newPlate);

      // Verify in DB
      const dbVehicle = await prisma.vehicle.findUnique({ where: { driverId: driverProfileId } });
      expect(dbVehicle?.make).toBe('Tesla');
      expect(dbVehicle?.plateNumber).toBe(newPlate);
    });

    it('2. Rejects duplicate plate number conflict', async () => {
      // Get the other driver's plate number
      const otherVehicle = await prisma.vehicle.findUnique({ where: { driverId: otherDriverProfileId } });
      expect(otherVehicle).toBeDefined();

      const res = await request(app)
        .put('/api/driver/vehicle')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          plateNumber: otherVehicle!.plateNumber,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PLATE_NUMBER_ALREADY_EXISTS');
    });
  });

  describe('PUT /api/driver/location', () => {
    it('1. Updates driver geographic coordinates location successfully', async () => {
      const res = await request(app)
        .put('/api/driver/location')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          lat: 12.9716,
          lng: 77.5946,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lat).toBe(12.9716);
      expect(res.body.data.lng).toBe(77.5946);

      // Verify in DB
      const dbLocation = await prisma.driverLocation.findUnique({ where: { driverId: driverProfileId } });
      expect(dbLocation?.lat).toBe(12.9716);
      expect(dbLocation?.lng).toBe(77.5946);
    });

    it('2. Rejects missing latitude or longitude parameters', async () => {
      const res = await request(app)
        .put('/api/driver/location')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          lat: 12.9716,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/driver/rides', () => {
    it('1. Returns list of assigned rides for this driver', async () => {
      const res = await request(app)
        .get('/api/driver/rides')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].id).toBe(testRideId);
    });
  });

  describe('GET /api/driver/rides/:id', () => {
    it('1. Returns ride detail successfully for the assigned driver', async () => {
      const res = await request(app)
        .get(`/api/driver/rides/${testRideId}`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testRideId);
    });

    it('2. Rejects access to another driver trying to view this ride', async () => {
      const res = await request(app)
        .get(`/api/driver/rides/${testRideId}`)
        .set('Authorization', `Bearer ${otherDriverToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
