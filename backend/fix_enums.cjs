const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  // Fix remaining SEDAN vehicle
  await p.$queryRawUnsafe(`UPDATE "Vehicle" SET type = 'CAB' WHERE type = 'SEDAN'`);
  // Fix any remaining old types in Vehicle
  await p.$queryRawUnsafe(`UPDATE "Vehicle" SET type = 'CAB' WHERE type IN ('SUV', 'HATCHBACK')`);
  // Fix any remaining old types in Ride
  await p.$queryRawUnsafe(`UPDATE "Ride" SET "vehicleType" = 'CAB' WHERE "vehicleType" IN ('SEDAN', 'SUV')`);
  await p.$queryRawUnsafe(`UPDATE "Ride" SET "vehicleType" = 'AUTO' WHERE "vehicleType" = 'HATCHBACK'`);

  const v = await p.$queryRawUnsafe('SELECT type, COUNT(*)::text as cnt FROM "Vehicle" GROUP BY type');
  const r = await p.$queryRawUnsafe('SELECT "vehicleType", COUNT(*)::text as cnt FROM "Ride" GROUP BY "vehicleType"');
  console.log('After fix - Vehicle types:', JSON.stringify(v));
  console.log('After fix - Ride types:', JSON.stringify(r));
}
main().catch(console.error).finally(() => p.$disconnect());
