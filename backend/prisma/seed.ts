import { PrismaClient, UserRole, DriverStatus, VehicleType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial system defaults safely (preserving existing data)...');

  // 1. Upsert Pricing Tiers (never delete existing pricing customizations)
  const defaultPricing = [
    { vehicleType: VehicleType.BIKE, baseFare: 20.0, perKmRate: 8.0, perMinuteRate: 1.0, minimumFare: 25.0 },
    { vehicleType: VehicleType.AUTO, baseFare: 30.0, perKmRate: 12.0, perMinuteRate: 1.5, minimumFare: 35.0 },
    { vehicleType: VehicleType.CAB, baseFare: 50.0, perKmRate: 18.0, perMinuteRate: 2.0, minimumFare: 60.0 },
  ];

  for (const p of defaultPricing) {
    const existing = await prisma.pricing.findFirst({ where: { vehicleType: p.vehicleType } });
    if (!existing) {
      await prisma.pricing.create({ data: p });
    }
  }

  // 2. Safe development-only hashed passwords
  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync('adminDevPass123', salt);
  const customerPasswordHash = bcrypt.hashSync('customerDevPass123', salt);
  const driverPasswordHash = bcrypt.hashSync('driverDevPass123', salt);

  // 3. Upsert Admin User
  const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@ridenow.com' } });
  if (!existingAdmin) {
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@ridenow.com',
        password: adminPasswordHash,
        role: UserRole.ADMIN,
      },
    });
    console.log(`Created default Admin user: ${adminUser.email}`);
  }

  // 4. Upsert Customer User
  const existingCustomer = await prisma.user.findUnique({ where: { email: 'customer@ridenow.com' } });
  if (!existingCustomer) {
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
    });
    console.log(`Created default Customer user: ${customerUser.email}`);
  }

  // 5. Upsert Driver User
  const existingDriver = await prisma.user.findUnique({ where: { email: 'driver@ridenow.com' } });
  if (!existingDriver) {
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
                type: VehicleType.CAB,
              },
            },
            driverLocation: {
              create: {
                lat: 12.9716,
                lng: 77.5946,
              },
            },
          },
        },
      },
    });
    console.log(`Created default Driver user: ${driverUser.email}`);
  }

  console.log('Seeding check completed. All existing data preserved!');
}

main()
  .catch((e) => {
    console.error('Error during safe seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
