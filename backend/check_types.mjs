import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const vt = await p['\']('SELECT type, COUNT(*) as cnt FROM "Vehicle" GROUP BY type');
const rt = await p['\']('SELECT "vehicleType", COUNT(*) as cnt FROM "Ride" GROUP BY "vehicleType"');
console.log('Vehicle types:', JSON.stringify(vt));
console.log('Ride types:', JSON.stringify(rt));
await p['\']();
