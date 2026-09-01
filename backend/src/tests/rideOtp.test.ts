import request from 'supertest';
import app from '../app';
import { PrismaClient, UserRole, RideStatus, VehicleType, DriverStatus } from '@prisma/client';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

describe('Ride 4-Digit Start OTP Authentication System', () => {
  let customerUser: any;
  let customerProfile: any;
  let customerToken: string;

  let driverUser: any;
  let driverProfile: any;
  let driverToken: string;

  beforeAll(async () => {
    // Ensure pricing configs exist
    await prisma.pricing.upsert({
      where: { vehicleType: VehicleType.BIKE },
      update: {},
      create: { vehicleType: VehicleType.BIKE, baseFare: 20, perKmRate: 7, perMinuteRate: 1, minimumFare: 20 }
    });

    const timestamp = Date.now();
    const unique = `${timestamp.toString().slice(-4)}${Math.floor(Math.random() * 1000)}`;

    customerUser = await prisma.user.create({
      data: {
        email: `otp-cust-${unique}@test.com`,
        password: 'hashedpassword',
        role: UserRole.CUSTOMER,
        customer: {
          create: {
            name: 'OTP Test Rider',
            phone: `+9198${unique.padStart(8, '0').slice(-8)}`
          }
        }
      },
      include: { customer: true }
    });
    customerProfile = customerUser.customer;
    customerToken = generateToken({ userId: customerUser.id, role: customerUser.role });

    driverUser = await prisma.user.create({
      data: {
        email: `otp-driver-${unique}@test.com`,
        password: 'hashedpassword',
        role: UserRole.DRIVER,
        driver: {
          create: {
            name: 'OTP Captain',
            phone: `+9197${unique.padStart(8, '0').slice(-8)}`,
            licenseNumber: `DL${unique}`,
            status: DriverStatus.ONLINE,
            isApproved: true,
            vehicle: {
              create: {
                make: 'Honda',
                model: 'Activa',
                year: 2023,
                color: 'Grey',
                plateNumber: `AP39B${unique}`,
                type: VehicleType.BIKE
              }
            },
            driverLocation: {
              create: {
                lat: 17.7210,
                lng: 83.3110
              }
            }
          }
        }
      },
      include: { driver: true }
    });
    driverProfile = driverUser.driver;
    driverToken = generateToken({ userId: driverUser.id, role: driverUser.role });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('generates a 4-digit numeric OTP (0000-9999) upon ride creation', async () => {
    const createRes = await request(app)
      .post('/api/customer/rides')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        pickupAddress: 'Siripuram Circle, Visakhapatnam',
        pickupLat: 17.7210,
        pickupLng: 83.3110,
        dropoffAddress: 'RK Beach, Visakhapatnam',
        dropoffLat: 17.7140,
        dropoffLng: 83.3240,
        vehicleType: 'BIKE',
        paymentMethodId: 'CASH'
      });

    expect(createRes.status).toBe(201);
    const ride = createRes.body.data;
    expect(ride.otp).toBeDefined();
    expect(typeof ride.otp).toBe('string');
    expect(ride.otp.length).toBe(4);
    expect(/^\d{4}$/.test(ride.otp)).toBe(true);

    const savedInDb = await prisma.ride.findUnique({ where: { id: ride.id } });
    expect(savedInDb?.otp).toBe(ride.otp);
  });

  it('rejects ride start if driver provides wrong OTP or missing OTP', async () => {
    const createRes = await request(app)
      .post('/api/customer/rides')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        pickupAddress: 'Gajuwaka, Visakhapatnam',
        pickupLat: 17.6900,
        pickupLng: 83.2100,
        dropoffAddress: 'NAD Junction, Visakhapatnam',
        dropoffLat: 17.7400,
        dropoffLng: 83.2400,
        vehicleType: 'BIKE',
        paymentMethodId: 'CASH'
      });
    const rideId = createRes.body.data.id;
    const realOtp = createRes.body.data.otp;

    // 1. Driver accepts ride -> DRIVER_ASSIGNED
    const acceptRes = await request(app)
      .post(`/api/driver/rides/${rideId}/accept`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({});
    expect(acceptRes.status).toBe(200);

    // 2. Driver starts heading to pickup -> DRIVER_ARRIVING
    const arrivingRes = await request(app)
      .post(`/api/driver/rides/${rideId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'DRIVER_ARRIVING' });
    expect(arrivingRes.status).toBe(200);

    // 3. Driver arrives at pickup -> DRIVER_ARRIVED
    const arriveRes = await request(app)
      .post(`/api/driver/rides/${rideId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'DRIVER_ARRIVED' });
    expect(arriveRes.status).toBe(200);

    // 4. Driver attempts to start with WRONG OTP
    const wrongOtp = realOtp === '9999' ? '0000' : '9999';
    const wrongOtpRes = await request(app)
      .post(`/api/driver/rides/${rideId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'RIDE_STARTED', otp: wrongOtp });

    expect(wrongOtpRes.status).toBe(400);
    expect(wrongOtpRes.body.success).toBe(false);
    expect(wrongOtpRes.body.error.code).toBe('INVALID_OTP');

    // 5. Driver attempts to start with missing OTP
    const missingOtpRes = await request(app)
      .post(`/api/driver/rides/${rideId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'RIDE_STARTED' });

    expect(missingOtpRes.status).toBe(400);
    expect(missingOtpRes.body.success).toBe(false);
    expect(missingOtpRes.body.error.code).toBe('INVALID_OTP');

    // 6. Driver starts with CORRECT OTP
    const correctOtpRes = await request(app)
      .post(`/api/driver/rides/${rideId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'RIDE_STARTED', otp: realOtp });

    expect(correctOtpRes.status).toBe(200);
    expect(correctOtpRes.body.success).toBe(true);
    expect(correctOtpRes.body.data.status).toBe(RideStatus.RIDE_STARTED);
  });
});
