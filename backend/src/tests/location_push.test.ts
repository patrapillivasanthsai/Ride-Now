import http from 'http';
import request from 'supertest';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { PrismaClient, UserRole, RideStatus, VehicleType } from '@prisma/client';
import app from '../app';
import { initSocketServer } from '../socket';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

describe('Maps, Location Tracking, and Push Notifications Integration Tests', () => {
  let server: http.Server;
  let port: number;

  let customerId: string;
  let customerProfileId: string;
  let customerToken: string;

  let driverId: string;
  let driverProfileId: string;
  let driverToken: string;

  let testRideId: string;
  const clients: ClientSocket[] = [];

  function createSocketClient(token?: string): ClientSocket {
    const socket = Client(`http://localhost:${port}`, {
      auth: token ? { token } : undefined,
      autoConnect: false,
      transports: ['websocket'],
    });
    clients.push(socket);
    return socket;
  }

  beforeAll(async () => {
    // Start HTTP and Socket.IO server on a random port
    server = http.createServer(app);
    initSocketServer(server);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === 'string' ? 3000 : addr?.port || 3000;
        resolve();
      });
    });

    // Create Customer
    const customerUser = await prisma.user.create({
      data: {
        email: `cust-${Date.now()}@loc-test.com`,
        password: 'hashedPassword',
        role: UserRole.CUSTOMER,
        customer: { create: { phone: '+13339990001' } },
      },
      include: { customer: true },
    });
    customerId = customerUser.id;
    customerProfileId = customerUser.customer!.id;
    customerToken = generateToken({ userId: customerUser.id, role: customerUser.role });

    // Create Driver (with Vehicle and Location)
    const driverUser = await prisma.user.create({
      data: {
        email: `driv-${Date.now()}@loc-test.com`,
        password: 'hashedPassword',
        role: UserRole.DRIVER,
        driver: {
          create: {
            phone: '+13339990002',
            isApproved: true,
            status: 'ONLINE',
            vehicle: {
              create: {
                make: 'Toyota',
                model: 'Prius',
                year: 2020,
                color: 'Silver',
                plateNumber: `PLT-LOC-${Date.now()}`,
                type: VehicleType.CAB,
              },
            },
            driverLocation: {
              create: {
                lat: 12.97,
                lng: 77.59,
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
  });

  afterAll(async () => {
    // Cleanup clients
    clients.forEach((client) => {
      if (client.connected) {
        client.disconnect();
      }
    });

    // Cleanup server
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

    // Cleanup DB
    await prisma.driverLocation.deleteMany({ where: { driverId: driverProfileId } });
    await prisma.rideStatusHistory.deleteMany({ where: { rideId: { in: [testRideId] } } });
    await prisma.notification.deleteMany({ where: { customerId: customerProfileId } });
    await prisma.ride.deleteMany({ where: { id: { in: [testRideId] } } });
    await prisma.vehicle.deleteMany({ where: { driverId: driverProfileId } });
    await prisma.driver.deleteMany({ where: { id: driverProfileId } });
    await prisma.customer.deleteMany({ where: { id: customerProfileId } });
    await prisma.user.deleteMany({ where: { id: { in: [customerId, driverId] } } });
    await prisma.$disconnect();
  });

  describe('POST /api/auth/fcm-token', () => {
    it('1. Customer registers device FCM token successfully', async () => {
      const res = await request(app)
        .post('/api/auth/fcm-token')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ token: 'test-fcm-device-token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify in DB
      const user = await prisma.user.findUnique({ where: { id: customerId } });
      expect(user?.fcmToken).toBe('test-fcm-device-token');
    });

    it('2. Rejects request with missing token parameter', async () => {
      const res = await request(app)
        .post('/api/auth/fcm-token')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Real-time Location Streaming', () => {
    let clientCustomer: ClientSocket;
    let clientDriver: ClientSocket;

    beforeEach((done) => {
      clientCustomer = createSocketClient(customerToken);
      clientDriver = createSocketClient(driverToken);

      let connectedCount = 0;
      const onConnect = () => {
        connectedCount++;
        if (connectedCount === 2) done();
      };

      clientCustomer.on('connect', onConnect);
      clientDriver.on('connect', onConnect);

      clientCustomer.connect();
      clientDriver.connect();
    });

    afterEach(async () => {
      clientCustomer.disconnect();
      clientDriver.disconnect();
      await prisma.rideStatusHistory.deleteMany({ where: { rideId: testRideId } });
      await prisma.ride.deleteMany({ where: { id: testRideId } });
    });

    it('1. Streams location changes from driver to assigned customer ride room', (done) => {
      // Create ride assigned to driver
      prisma.ride.create({
        data: {
          customerId: customerProfileId,
          driverId: driverProfileId,
          pickupAddress: 'Start Location',
          pickupLat: 12.9716,
          pickupLng: 77.5946,
          dropoffAddress: 'End Location',
          dropoffLat: 12.9352,
          dropoffLng: 77.6245,
          fare: 150.0,
          vehicleType: VehicleType.CAB,
          status: RideStatus.DRIVER_ASSIGNED,
        },
      }).then((ride) => {
        testRideId = ride.id;

        // Customer joins ride room
        clientCustomer.emit('join_ride', testRideId, (response: any) => {
          expect(response.success).toBe(true);

          // Customer sets listener for coordinate updates
          clientCustomer.on('driver_location_changed', (coords: any) => {
            expect(coords.driverId).toBe(driverProfileId);
            expect(coords.lat).toBe(12.9805);
            expect(coords.lng).toBe(77.5932);
            done();
          });

          // Driver streams update over socket
          clientDriver.emit('driver_location_update', {
            lat: 12.9805,
            lng: 77.5932,
          });
        });
      });
    });
  });

  describe('FCM Push Notifications & DB Logs Triggers', () => {
    beforeEach(async () => {
      // Register token for customer to trigger push updates
      await prisma.user.update({
        where: { id: customerId },
        data: { fcmToken: 'customer-device-token' },
      });

      const ride = await prisma.ride.create({
        data: {
          customerId: customerProfileId,
          pickupAddress: 'Start Address',
          pickupLat: 12.97,
          pickupLng: 77.59,
          dropoffAddress: 'End Address',
          dropoffLat: 12.93,
          dropoffLng: 77.62,
          fare: 120.0,
          status: RideStatus.SEARCHING_DRIVER,
        },
      });
      testRideId = ride.id;
    });

    afterEach(async () => {
      await prisma.notification.deleteMany({ where: { customerId: customerProfileId } });
      await prisma.rideStatusHistory.deleteMany({ where: { rideId: testRideId } });
      await prisma.ride.deleteMany({ where: { id: testRideId } });
    });

    it('1. Log local database notification alert when driver accepts ride', async () => {
      // Driver accepts
      await request(app)
        .patch(`/api/driver/rides/${testRideId}/accept`)
        .set('Authorization', `Bearer ${driverToken}`);

      // Verify DB Notification log created
      const dbNotifications = await prisma.notification.findMany({
        where: { customerId: customerProfileId },
      });

      expect(dbNotifications.length).toBeGreaterThanOrEqual(1);
      expect(dbNotifications[0].title).toBe('Ride Booked!');
      expect(dbNotifications[0].isRead).toBe(false);
    });
  });
});
