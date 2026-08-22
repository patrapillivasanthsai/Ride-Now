import { PrismaClient, UserRole, DriverStatus, VehicleType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  // Delete in reverse order of relationships to prevent foreign key constraint violations
  await prisma.driverLocation.deleteMany({});
  await prisma.rating.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.rideStatusHistory.deleteMany({});
  await prisma.ride.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.driver.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.pricing.deleteMany({});

  console.log('Seeding pricing information...');
  await prisma.pricing.createMany({
    data: [
      {
        vehicleType: VehicleType.BIKE,
        baseFare: 20.0,      // e.g. $2.00 or Rs 20
        perKmRate: 6.0,
        perMinuteRate: 1.0,
      },
      {
        vehicleType: VehicleType.HATCHBACK,
        baseFare: 40.0,
        perKmRate: 12.0,
        perMinuteRate: 2.0,
      },
      {
        vehicleType: VehicleType.SEDAN,
        baseFare: 50.0,
        perKmRate: 15.0,
        perMinuteRate: 2.5,
      },
      {
        vehicleType: VehicleType.SUV,
        baseFare: 80.0,
        perKmRate: 20.0,
        perMinuteRate: 3.5,
      },
    ],
  });

  console.log('Seeding development users...');
  // Safe development-only hashed passwords
  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync('adminDevPass123', salt);
  const customerPasswordHash = bcrypt.hashSync('customerDevPass123', salt);
  const driverPasswordHash = bcrypt.hashSync('driverDevPass123', salt);

  // 1. Create Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@ridenow.com',
      password: adminPasswordHash,
      role: UserRole.ADMIN,
    },
  });
  console.log(`Created Admin user: ${adminUser.email}`);

  // 2. Create Customer User and Profile
  const customerUser = await prisma.user.create({
    data: {
      email: 'customer@ridenow.com',
      password: customerPasswordHash,
      role: UserRole.CUSTOMER,
      customer: {
        create: {
          phone: '+15550100200',
        },
      },
    },
    include: {
      customer: true,
    },
  });
  console.log(`Created Customer user: ${customerUser.email}`);

  // 3. Create Driver User, Profile, Vehicle, and Location
  const driverUser = await prisma.user.create({
    data: {
      email: 'driver@ridenow.com',
      password: driverPasswordHash,
      role: UserRole.DRIVER,
      driver: {
        create: {
          phone: '+15550100300',
          isApproved: true,
          status: DriverStatus.ONLINE,
          vehicle: {
            create: {
              make: 'Toyota',
              model: 'Camry',
              year: 2022,
              color: 'Silver',
              plateNumber: 'RIDE-123-NOW',
              type: VehicleType.SEDAN,
            },
          },
          driverLocation: {
            create: {
              lat: 12.9716, // Bangalore default center for local testing
              lng: 77.5946,
            },
          },
        },
      },
    },
    include: {
      driver: {
        include: {
          vehicle: true,
          driverLocation: true,
        },
      },
    },
  });
  console.log(`Created Driver user: ${driverUser.email} with vehicle and location.`);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
