import http from 'http';
import request from 'supertest';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { PrismaClient, UserRole, RideStatus } from '@prisma/client';
import app from '../app';
import { initSocketServer } from '../socket';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

describe('Socket.IO Real-time Communication Integration Tests', () => {
  let server: http.Server;
  let port: number;

  let customerId: string;
  let customerProfileId: string;
  let customerToken: string;

  let driverId: string;
  let driverProfileId: string;
  let driverToken: string;

  let otherCustomerId: string;
  let otherCustomerProfileId: string;
  let otherCustomerToken: string;

  let testRideId: string;
  const clients: ClientSocket[] = [];

  // Helper: Create socket client
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
        email: `cust-${Date.now()}@socket-test.com`,
        password: 'hashedPassword',
        role: UserRole.CUSTOMER,
        customer: { create: { phone: '+12229990001' } },
      },
      include: { customer: true },
    });
    customerId = customerUser.id;
    customerProfileId = customerUser.customer!.id;
    customerToken = generateToken({ userId: customerUser.id, role: customerUser.role });

    // Create Driver
    const driverUser = await prisma.user.create({
      data: {
        email: `driv-${Date.now()}@socket-test.com`,
        password: 'hashedPassword',
        role: UserRole.DRIVER,
        driver: { create: { phone: '+12229990002' } },
      },
      include: { driver: true },
    });
    driverId = driverUser.id;
    driverProfileId = driverUser.driver!.id;
    driverToken = generateToken({ userId: driverUser.id, role: driverUser.role });

    // Create Other Customer
    const otherUser = await prisma.user.create({
      data: {
        email: `cust-oth-${Date.now()}@socket-test.com`,
        password: 'hashedPassword',
        role: UserRole.CUSTOMER,
        customer: { create: { phone: '+12229990003' } },
      },
      include: { customer: true },
    });
    otherCustomerId = otherUser.id;
    otherCustomerProfileId = otherUser.customer!.id;
    otherCustomerToken = generateToken({ userId: otherUser.id, role: otherUser.role });
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

    // Cleanup DB records
    await prisma.rideStatusHistory.deleteMany({
      where: { ride: { customerId: { in: [customerProfileId, otherCustomerProfileId] } } }
    });
    await prisma.ride.deleteMany({
      where: { customerId: { in: [customerProfileId, otherCustomerProfileId] } }
    });
    await prisma.driver.deleteMany({ where: { id: driverProfileId } });
    await prisma.customer.deleteMany({ where: { id: { in: [customerProfileId, otherCustomerProfileId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [customerId, driverId, otherCustomerId] } } });
    await prisma.$disconnect();
  });

  describe('Connection Authentication & Security', () => {
    it('1. Connects successfully with a valid JWT token', (done) => {
      const client = createSocketClient(customerToken);
      client.on('connect', () => {
        expect(client.connected).toBe(true);
        done();
      });
      client.connect();
    });

    it('2. Refuses connection with an invalid token', (done) => {
      const client = createSocketClient('invalid-token-sig');
      client.on('connect_error', (err) => {
        expect(err.message).toBe('Invalid token');
        done();
      });
      client.connect();
    });
  });

  describe('Room Gating & Security Checks', () => {
    beforeEach(async () => {
      const ride = await prisma.ride.create({
        data: {
          customerId: customerProfileId,
          pickupAddress: 'Start location',
          pickupLat: 12.9,
          pickupLng: 77.5,
          dropoffAddress: 'End location',
          dropoffLat: 12.95,
          dropoffLng: 77.55,
          fare: 100.0,
          status: RideStatus.REQUESTED,
        },
      });
      testRideId = ride.id;
    });

    afterEach(async () => {
      await prisma.rideStatusHistory.deleteMany({ where: { rideId: testRideId } });
      await prisma.ride.deleteMany({ where: { id: testRideId } });
    });

    it('1. Owner customer can subscribe to their ride updates room', (done) => {
      const client = createSocketClient(customerToken);
      client.on('connect', () => {
        client.emit('join_ride', testRideId, (response: any) => {
          expect(response.success).toBe(true);
          done();
        });
      });
      client.connect();
    });

    it('2. Another customer is blocked from subscribing to the ride updates room', (done) => {
      const client = createSocketClient(otherCustomerToken);
      client.on('connect', () => {
        client.emit('join_ride', testRideId, (response: any) => {
          expect(response.success).toBe(false);
          expect(response.error).toBe('Forbidden');
          done();
        });
      });
      client.connect();
    });
  });

  describe('Real-time Events and Broadcasters Flow', () => {
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

    it('1. Emits available_ride_created to drivers when a customer books a ride', (done) => {
      clientDriver.on('available_ride_created', (data: any) => {
        expect(data.ride).toBeDefined();
        expect(data.ride.pickupAddress).toBe('Real-time Start');
        testRideId = data.ride.id;
        done();
      });

      // Customer triggers REST creation API
      prisma.pricing.upsert({
        where: { vehicleType: 'CAB' },
        update: {},
        create: { vehicleType: 'CAB', baseFare: 5.0, perKmRate: 1.5, perMinuteRate: 0.2 }
      }).then(() => {
        request(app)
          .post('/api/customer/rides')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            pickupAddress: 'Real-time Start',
            pickupLat: 12.9802,
            pickupLng: 77.5928,
            dropoffAddress: 'Real-time End',
            dropoffLat: 12.9352,
            dropoffLng: 77.6245,
            vehicleType: 'CAB',
            paymentMethodId: 'pm_mock_visa'
          })
          .end(() => {});
      });
    }, 15000);

    it('2. Emits ride_status_changed to customer and available_ride_removed to drivers when ride is accepted', (done) => {
      // First create ride
      prisma.ride.create({
        data: {
          customerId: customerProfileId,
          pickupAddress: 'Vasanth Nagar',
          pickupLat: 12.9802,
          pickupLng: 77.5928,
          dropoffAddress: 'Koramangala',
          dropoffLat: 12.9352,
          dropoffLng: 77.6245,
          fare: 150.0,
          vehicleType: 'CAB',
          status: RideStatus.SEARCHING_DRIVER,
        }
      }).then((ride) => {
        testRideId = ride.id;

        // Configure driver search mock
        prisma.driver.update({
          where: { id: driverProfileId },
          data: { isApproved: true, status: 'ONLINE' }
        }).then(() => {
          // Subscribe customer to their ride room
          clientCustomer.emit('join_ride', testRideId, (response: any) => {
            expect(response.success).toBe(true);

            let changedEmitted = false;
            let removedEmitted = false;

            const checkDone = () => {
              if (changedEmitted && removedEmitted) {
                done();
              }
            };

            // Set listeners
            clientCustomer.on('ride_status_changed', (data: any) => {
              expect(data.ride.status).toBe('DRIVER_ASSIGNED');
              expect(data.ride.driverId).toBe(driverProfileId);
              changedEmitted = true;
              checkDone();
            });

            clientDriver.on('available_ride_removed', (data: any) => {
              expect(data.rideId).toBe(testRideId);
              removedEmitted = true;
              checkDone();
            });

            // Driver accepts the ride
            request(app)
              .patch(`/api/driver/rides/${testRideId}/accept`)
              .set('Authorization', `Bearer ${driverToken}`)
              .end(() => {});
          });
        });
      });
    });
  });
});
