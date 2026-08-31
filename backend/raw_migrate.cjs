const { Client } = require('pg');
const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '2002',
  database: 'ridenow',
});

async function main() {
  await client.connect();
  console.log('Connected to DB');

  // Check current enum values
  const enumCheck = await client.query(`
    SELECT enumlabel FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'VehicleType'
    ORDER BY enumsortorder
  `);
  console.log('Current VehicleType enum values:', enumCheck.rows.map(r => r.enumlabel));

  // Add new values to the existing enum if they don't exist
  const existingLabels = enumCheck.rows.map(r => r.enumlabel);
  
  if (!existingLabels.includes('BIKE')) {
    await client.query(`ALTER TYPE "VehicleType" ADD VALUE IF NOT EXISTS 'BIKE'`);
    console.log('Added BIKE to enum');
  }
  if (!existingLabels.includes('AUTO')) {
    await client.query(`ALTER TYPE "VehicleType" ADD VALUE IF NOT EXISTS 'AUTO'`);
    console.log('Added AUTO to enum');
  }
  if (!existingLabels.includes('CAB')) {
    await client.query(`ALTER TYPE "VehicleType" ADD VALUE IF NOT EXISTS 'CAB'`);
    console.log('Added CAB to enum');
  }

  // Migrate old values in Vehicle table
  await client.query(`UPDATE "Vehicle" SET type = 'CAB' WHERE type IN ('SEDAN', 'SUV', 'HATCHBACK')`);
  console.log('Updated Vehicle table');

  // Migrate old values in Ride table
  await client.query(`UPDATE "Ride" SET "vehicleType" = 'CAB' WHERE "vehicleType" IN ('SEDAN', 'SUV')`);
  await client.query(`UPDATE "Ride" SET "vehicleType" = 'AUTO' WHERE "vehicleType" = 'HATCHBACK'`);
  console.log('Updated Ride table');

  // Check Pricing table
  const pricingCheck = await client.query(`SELECT "vehicleType" FROM "Pricing"`);
  console.log('Pricing records:', pricingCheck.rows.map(r => r.vehicleType));
  
  await client.query(`UPDATE "Pricing" SET "vehicleType" = 'CAB' WHERE "vehicleType" IN ('SEDAN', 'SUV', 'HATCHBACK')`);
  await client.query(`UPDATE "Pricing" SET "vehicleType" = 'AUTO' WHERE "vehicleType" = 'HATCHBACK'`);
  console.log('Updated Pricing table if needed');

  // Verify
  const v = await client.query('SELECT type, COUNT(*) as cnt FROM "Vehicle" GROUP BY type');
  const r = await client.query('SELECT "vehicleType", COUNT(*) as cnt FROM "Ride" GROUP BY "vehicleType"');
  const pr = await client.query('SELECT "vehicleType" FROM "Pricing"');
  console.log('Final Vehicle types:', v.rows);
  console.log('Final Ride types:', r.rows);
  console.log('Final Pricing types:', pr.rows.map(r => r.vehicleType));

  await client.end();
}

main().catch(e => { console.error('Error:', e.message); client.end(); });
