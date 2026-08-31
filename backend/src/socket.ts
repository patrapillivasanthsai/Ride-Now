import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyToken } from './utils/jwt';
import { PrismaClient, UserRole, RideStatus } from '@prisma/client';

const prisma = new PrismaClient();
let io: SocketIOServer | null = null;

// Map to track user connections to socket IDs: userId -> Set of socketIds
const userSockets = new Map<string, Set<string>>();

export function initSocketServer(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    }
  });

  // Middleware: Verify JWT in socket handshake
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    try {
      const decoded = verifyToken(cleanToken);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true }
      });

      if (!user) {
        return next(new Error('User session no longer exists'));
      }

      socket.data = {
        userId: user.id,
        email: user.email,
        role: user.role
      };

      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, role } = socket.data;

    // Track active connection
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Join default rooms
    socket.join(`user_room_${userId}`);
    socket.join(`role_room_${role}`);

    // Client requests to subscribe to a specific ride status feed
    socket.on('join_ride', async (rideId: string, callback?: (response: any) => void) => {
      try {
        const ride = await prisma.ride.findUnique({
          where: { id: rideId }
        });

        if (!ride) {
          if (callback) callback({ success: false, error: 'Ride not found' });
          return;
        }

        // Authorization checks
        if (role === UserRole.CUSTOMER) {
          const customer = await prisma.customer.findUnique({
            where: { userId }
          });
          if (!customer || ride.customerId !== customer.id) {
            if (callback) callback({ success: false, error: 'Forbidden' });
            return;
          }
        } else if (role === UserRole.DRIVER) {
          const driver = await prisma.driver.findUnique({
            where: { userId }
          });
          if (!driver) {
            if (callback) callback({ success: false, error: 'Driver profile not found' });
            return;
          }
          // Drivers can join if:
          // 1. The ride is unassigned (so they can monitor it) OR
          // 2. The ride is assigned to them.
          if (ride.driverId && ride.driverId !== driver.id) {
            if (callback) callback({ success: false, error: 'Forbidden' });
            return;
          }
        } else if (role !== UserRole.ADMIN) {
          if (callback) callback({ success: false, error: 'Forbidden' });
          return;
        }

        socket.join(`ride_room_${rideId}`);
        if (callback) callback({ success: true });
      } catch (err: any) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // Handle real-time driver GPS coordinate streaming updates
    socket.on('driver_location_update', async (coords: { lat: number; lng: number }) => {
      if (role !== UserRole.DRIVER) return;
      if (coords.lat === undefined || coords.lng === undefined) return;

      try {
        const driver = await prisma.driver.findUnique({
          where: { userId }
        });

        if (!driver) return;

        // Sync to database location
        await prisma.driverLocation.upsert({
          where: { driverId: driver.id },
          update: { lat: coords.lat, lng: coords.lng },
          create: { driverId: driver.id, lat: coords.lat, lng: coords.lng }
        });

        // Query active rides assigned to this driver
        const activeRides = await prisma.ride.findMany({
          where: {
            driverId: driver.id,
            status: {
              in: [
                RideStatus.DRIVER_ASSIGNED,
                RideStatus.DRIVER_ARRIVING,
                RideStatus.DRIVER_ARRIVED,
                RideStatus.RIDE_STARTED
              ]
            }
          }
        });

        // Broadcast updates to the active ride rooms
        activeRides.forEach((ride) => {
          io?.to(`ride_room_${ride.id}`).emit('driver_location_changed', {
            driverId: driver.id,
            lat: coords.lat,
            lng: coords.lng
          });
        });

      } catch (err) {
        console.error('Error handling driver location update:', err);
      }
    });

    // Client requests to unsubscribe from a ride status feed
    socket.on('leave_ride', (rideId: string) => {
      socket.leave(`ride_room_${rideId}`);
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      const connections = userSockets.get(userId);
      if (connections) {
        connections.delete(socket.id);
        if (connections.size === 0) {
          userSockets.delete(userId);
        }
      }
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO server has not been initialized');
  }
  return io;
}

// Global helper: Emit event to a specific user
export function emitToUser(userId: string, eventName: string, data: any) {
  if (io) {
    io.to(`user_room_${userId}`).emit(eventName, data);
  }
}

// Global helper: Emit event to all sockets matching a role
export function emitToRole(role: UserRole, eventName: string, data: any) {
  if (io) {
    io.to(`role_room_${role}`).emit(eventName, data);
  }
}

// Global helper: Emit event to a specific ride room channel
export function emitToRide(rideId: string, eventName: string, data: any) {
  if (io) {
    io.to(`ride_room_${rideId}`).emit(eventName, data);
  }
}
