const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const v = await p.$queryRawUnsafe('SELECT type, COUNT(*)::text as cnt FROM "Vehicle" GROUP BY type');
  const r = await p.$queryRawUnsafe('SELECT "vehicleType", COUNT(*)::text as cnt FROM "Ride" GROUP BY "vehicleType"');
  console.log('Vehicle types:', JSON.stringify(v));
  console.log('Ride types:', JSON.stringify(r));
}
main().catch(console.error).finally(() => p.$disconnect());
