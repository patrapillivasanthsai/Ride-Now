const { Client } = require('pg');
const client = new Client({
  host: 'localhost', port: 5432, user: 'postgres', password: '2002', database: 'ridenow',
});

async function main() {
  await client.connect();

  // Show current pricing records
  const pr = await client.query('SELECT id, "vehicleType", "baseFare", "perKmRate", "perMinuteRate" FROM "Pricing" ORDER BY "vehicleType"');
  console.log('Current Pricing:', JSON.stringify(pr.rows));

  // BIKE is already there and fine - skip it
  // HATCHBACK → AUTO: delete old HATCHBACK pricing (we may already have BIKE, no AUTO yet)
  // SUV/SEDAN → CAB: delete duplicates, keep one

  // Delete HATCHBACK and rename the remaining one to AUTO
  const hatchbackRows = await client.query(`SELECT id FROM "Pricing" WHERE "vehicleType" = 'HATCHBACK'`);
  if (hatchbackRows.rows.length > 0) {
    const hatchbackId = hatchbackRows.rows[0].id;
    // Check if AUTO already exists
    const autoExists = await client.query(`SELECT id FROM "Pricing" WHERE "vehicleType" = 'AUTO'`);
    if (autoExists.rows.length === 0) {
      // Rename HATCHBACK to AUTO
      await client.query(`UPDATE "Pricing" SET "vehicleType" = 'AUTO' WHERE id = $1`, [hatchbackId]);
      console.log('Renamed HATCHBACK to AUTO in Pricing');
    } else {
      // Delete hatchback, AUTO already exists
      await client.query(`DELETE FROM "Pricing" WHERE id = $1`, [hatchbackId]);
      console.log('Deleted HATCHBACK from Pricing (AUTO already exists)');
    }
  }

  // For SEDAN/SUV - convert the first one to CAB, delete the rest
  const cabCandidates = await client.query(`SELECT id, "vehicleType" FROM "Pricing" WHERE "vehicleType" IN ('SEDAN', 'SUV') ORDER BY "vehicleType"`);
  console.log('CAB candidates:', JSON.stringify(cabCandidates.rows));
  
  const cabExists = await client.query(`SELECT id FROM "Pricing" WHERE "vehicleType" = 'CAB'`);
  if (cabExists.rows.length === 0 && cabCandidates.rows.length > 0) {
    // Convert first one to CAB
    await client.query(`UPDATE "Pricing" SET "vehicleType" = 'CAB' WHERE id = $1`, [cabCandidates.rows[0].id]);
    console.log('Renamed first candidate to CAB');
    // Delete rest
    for (let i = 1; i < cabCandidates.rows.length; i++) {
      await client.query(`DELETE FROM "Pricing" WHERE id = $1`, [cabCandidates.rows[i].id]);
    }
  } else {
    // CAB already exists, delete all SEDAN/SUV
    for (const row of cabCandidates.rows) {
      await client.query(`DELETE FROM "Pricing" WHERE id = $1`, [row.id]);
    }
    console.log('Deleted SEDAN/SUV from Pricing (CAB already exists)');
  }

  // Final state
  const final = await client.query('SELECT "vehicleType", "baseFare", "perKmRate", "perMinuteRate" FROM "Pricing"');
  console.log('Final Pricing:', JSON.stringify(final.rows));

  await client.end();
}

main().catch(e => { console.error('Error:', e.message); client.end(); });
