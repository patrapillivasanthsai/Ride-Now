import request from 'supertest';
import app from '../app';
import { PrismaClient, UserRole, VehicleType, DriverStatus, RideStatus, PaymentStatus } from '@prisma/client';
import { generateToken } from '../utils/jwt';
import { DispatchService } from '../services/dispatch.service';

const prisma = new PrismaClient();

describe('Premium Automatic Ride Dispatch and Driver Assignment System', () => {
  beforeAll(async () => {
    // Ensure pricing configurations exist
    await prisma.pricing.upsert({
      where: { vehicleType: VehicleType.CAB },
      update: {},
      create: { vehicleType: VehicleType.CAB, baseFare: 50, perKmRate: 15, perMinuteRate: 2, minimumFare: 50 }
    });
    await prisma.pricing.upsert({
      where: { vehicleType: VehicleType.AUTO },
      update: {},
      create: { vehicleType: VehicleType.AUTO, baseFare: 30, perKmRate: 10, perMinuteRate: 1.5, minimumFare: 30 }
    });
    await prisma.pricing.upsert({
      where: { vehicleType: VehicleType.BIKE },
      update: {},
      create: { vehicleType: VehicleType.BIKE, baseFare: 20, perKmRate: 7, perMinuteRate: 1, minimumFare: 20 }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Helper to create customer
  async function createTestCustomer(suffix: string) {
    const user = await prisma.user.create({
      data: {
        email: `cust-${suffix}-${Date.now()}@test.com`,
        password: 'hashedpassword',
        role: UserRole.CUSTOMER,
        customer: {
          create: {
            name: `Test Customer ${suffix}`,
            phone: `+9198${Date.now().toString().slice(-8)}`
          }
        }
      },
      include: { customer: true }
    });
    const token = generateToken({ userId: user.id, role: user.role });
    return { user, customer: user.customer!, token };
  }

  // Helper to create driver
  async function createTestDriver(suffix: string, vehicleType: VehicleType, isApproved = true, status: DriverStatus = DriverStatus.ONLINE) {
    const uniqueNum = `${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 1000)}`;
    const user = await prisma.user.create({
      data: {
        email: `driver-${suffix}-${uniqueNum}@test.com`,
        password: 'hashedpassword',
        role: UserRole.DRIVER,
        driver: {
          create: {
            name: `Captain ${suffix}`,
            phone: `+9197${uniqueNum.padStart(8, '0').slice(-8)}`,
            isApproved,
            status,
            vehicle: {
              create: {
                make: 'Hyundai',
                model: 'Xcent',
                year: 2022,
                color: 'White',
                plateNumber: `AP39AB${uniqueNum}`,
                type: vehicleType
              }
            },
            driverLocation: {
              create: {
                lat: 17.7200,
                lng: 83.3100
              }
            }
          }
        }
      },
      include: { driver: { include: { vehicle: true } } }
    });
    const token = generateToken({ userId: user.id, role: user.role });
    return { user, driver: user.driver!, token };
  }

  // SCENARIO A: Cash Ride Flow
  it('Scenario A: Cash Ride creates ride, calculates fare in INR, and auto-dispatches to matching driver', async () => {
    const { token: custToken, customer } = await createTestCustomer('cashA');
    const { token: driverToken, driver } = await createTestDriver('cabDriverA', VehicleType.CAB, true, DriverStatus.ONLINE);

    // 1. Customer books a CAB ride with CASH
    const bookRes = await request(app)
      .post('/api/customer/rides')
      .set('Authorization', `Bearer ${custToken}`)
      .send({
        pickupAddress: 'Siripuram Junction, Vizag',
        pickupLat: 17.7210,
        pickupLng: 83.3110,
        dropoffAddress: 'MVP Colony, Vizag',
        dropoffLat: 17.7400,
        dropoffLng: 83.3300,
        vehicleType: 'CAB',
        paymentMethodId: 'CASH'
      });

    expect(bookRes.status).toBe(201);
    expect(bookRes.body.success).toBe(true);
    const rideId = bookRes.body.data.id;
    expect(bookRes.body.data.status).toBe(RideStatus.SEARCHING_DRIVER);
    expect(bookRes.body.data.fare).toBeGreaterThan(0);

    // 2. Matching Cab Driver queries available rides
    const availableRes = await request(app)
      .get('/api/driver/rides/available')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(availableRes.status).toBe(200);
    expect(availableRes.body.success).toBe(true);
    const matchedRide = availableRes.body.data.find((r: any) => r.id === rideId);
    expect(matchedRide).toBeDefined();
    expect(matchedRide.vehicleType).toBe(VehicleType.CAB);
    expect(matchedRide.paymentMethod).toBe('CASH');

    // 3. Driver accepts ride
    const acceptRes = await request(app)
      .post(`/api/driver/rides/${rideId}/accept`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
    expect(acceptRes.body.data.status).toBe(RideStatus.DRIVER_ASSIGNED);
    expect(acceptRes.body.data.driverId).toBe(driver.id);

    // 4. Driver becomes BUSY
    const updatedDriver = await prisma.driver.findUnique({ where: { id: driver.id } });
    expect(updatedDriver?.status).toBe(DriverStatus.BUSY);

    // 5. Customer views ride detail: shows DRIVER_ASSIGNED and captain details
    const detailRes = await request(app)
      .get(`/api/customer/rides/${rideId}`)
      .set('Authorization', `Bearer ${custToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.status).toBe(RideStatus.DRIVER_ASSIGNED);
    expect(detailRes.body.data.driver.id).toBe(driver.id);
  });

  // SCENARIO C: Driver Declines and Roll-over
  it('Scenario C: Driver declines ride request and system auto-dispatches to next available driver', async () => {
    const { token: custToken } = await createTestCustomer('declineC');
    const { token: driver1Token, driver: driver1 } = await createTestDriver('driverC1', VehicleType.AUTO, true, DriverStatus.ONLINE);
    const { token: driver2Token, driver: driver2 } = await createTestDriver('driverC2', VehicleType.AUTO, true, DriverStatus.ONLINE);

    // 1. Customer books AUTO ride
    const bookRes = await request(app)
      .post('/api/customer/rides')
      .set('Authorization', `Bearer ${custToken}`)
      .send({
        pickupAddress: 'Beach Road, Vizag',
        pickupLat: 17.7100,
        pickupLng: 83.3150,
        dropoffAddress: 'Gajuwaka, Vizag',
        dropoffLat: 17.6800,
        dropoffLng: 83.2000,
        vehicleType: 'AUTO',
        paymentMethodId: 'CASH'
      });

    const rideId = bookRes.body.data.id;

    // 2. Driver 1 declines the ride
    const declineRes = await request(app)
      .post(`/api/driver/rides/${rideId}/decline`)
      .set('Authorization', `Bearer ${driver1Token}`)
      .send({ reason: 'TOO_FAR' });

    expect(declineRes.status).toBe(200);
    expect(declineRes.body.success).toBe(true);

    // 3. Driver 1 should no longer see the ride
    const d1Avail = await request(app)
      .get('/api/driver/rides/available')
      .set('Authorization', `Bearer ${driver1Token}`);
    expect(d1Avail.body.data.find((r: any) => r.id === rideId)).toBeUndefined();

    // 4. Driver 2 receives and can accept the ride
    const d2Avail = await request(app)
      .get('/api/driver/rides/available')
      .set('Authorization', `Bearer ${driver2Token}`);
    expect(d2Avail.body.data.find((r: any) => r.id === rideId)).toBeDefined();

    const acceptRes = await request(app)
      .post(`/api/driver/rides/${rideId}/accept`)
      .set('Authorization', `Bearer ${driver2Token}`)
      .send({});
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.driverId).toBe(driver2.id);
  });

  // SCENARIO D: Strict Vehicle Matching
  it('Scenario D: Strict vehicle type matching prevents incorrect vehicle type assignment', async () => {
    const { token: custToken } = await createTestCustomer('bikeOnly');
    const { token: bikeDriverToken } = await createTestDriver('bikeD', VehicleType.BIKE, true, DriverStatus.ONLINE);
    const { token: cabDriverToken, driver: cabDriver } = await createTestDriver('cabD', VehicleType.CAB, true, DriverStatus.ONLINE);

    // 1. Customer books BIKE ride
    const bookRes = await request(app)
      .post('/api/customer/rides')
      .set('Authorization', `Bearer ${custToken}`)
      .send({
        pickupAddress: 'Railway Station, Vizag',
        pickupLat: 17.7250,
        pickupLng: 83.2950,
        dropoffAddress: 'Dwaraka Nagar, Vizag',
        dropoffLat: 17.7300,
        dropoffLng: 83.3050,
        vehicleType: 'BIKE',
        paymentMethodId: 'CASH'
      });

    const rideId = bookRes.body.data.id;

    // 2. Cab driver does NOT see Bike ride in available
    const cabAvail = await request(app)
      .get('/api/driver/rides/available')
      .set('Authorization', `Bearer ${cabDriverToken}`);
    expect(cabAvail.body.data.find((r: any) => r.id === rideId)).toBeUndefined();

    // 3. Cab driver attempting to accept BIKE ride gets rejected with 400
    const invalidAccept = await request(app)
      .post(`/api/driver/rides/${rideId}/accept`)
      .set('Authorization', `Bearer ${cabDriverToken}`)
      .send({});
    expect(invalidAccept.status).toBe(400);
    expect(invalidAccept.body.error.code).toBe('INCOMPATIBLE_VEHICLE');

    // 4. Bike driver sees and accepts
    const bikeAvail = await request(app)
      .get('/api/driver/rides/available')
      .set('Authorization', `Bearer ${bikeDriverToken}`);
    expect(bikeAvail.body.data.find((r: any) => r.id === rideId)).toBeDefined();

    const bikeAccept = await request(app)
      .post(`/api/driver/rides/${rideId}/accept`)
      .set('Authorization', `Bearer ${bikeDriverToken}`)
      .send({});
    expect(bikeAccept.status).toBe(200);
  });

  // SCENARIO E: Concurrency & Atomicity
  it('Scenario E: Multiple drivers concurrently accepting the same ride allows only one winner', async () => {
    const { token: custToken } = await createTestCustomer('raceE');
    const { token: d1Token } = await createTestDriver('racer1', VehicleType.CAB, true, DriverStatus.ONLINE);
    const { token: d2Token } = await createTestDriver('racer2', VehicleType.CAB, true, DriverStatus.ONLINE);

    const bookRes = await request(app)
      .post('/api/customer/rides')
      .set('Authorization', `Bearer ${custToken}`)
      .send({
        pickupAddress: 'Rushikonda, Vizag',
        pickupLat: 17.7810,
        pickupLng: 83.3850,
        dropoffAddress: 'GITAM, Vizag',
        dropoffLat: 17.7850,
        dropoffLng: 83.3800,
        vehicleType: 'CAB',
        paymentMethodId: 'CASH'
      });

    const rideId = bookRes.body.data.id;

    // Both drivers accept simultaneously
    const [res1, res2] = await Promise.all([
      request(app).post(`/api/driver/rides/${rideId}/accept`).set('Authorization', `Bearer ${d1Token}`).send({}),
      request(app).post(`/api/driver/rides/${rideId}/accept`).set('Authorization', `Bearer ${d2Token}`).send({})
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(200);
    expect(statuses.some(s => s === 400 || s === 409)).toBe(true);
  });
});
