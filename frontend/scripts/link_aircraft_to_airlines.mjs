import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n=== Linking Aircraft to Airlines Based on Flight Callsigns ===\n");

  // Get all airlines in the database
  const airlines = await prisma.airline.findMany({
    select: { id: true, icaoCode: true, callsign: true, name: true }
  });

  // Create a map of ICAO codes to airline IDs
  const icaoToAirlineId = new Map();
  airlines.forEach(airline => {
    icaoToAirlineId.set(airline.icaoCode, airline.id);
  });

  console.log(`Loaded ${airlines.length} airlines from database\n`);

  // Find all aircraft with flights but no airline ID
  const unlinkedAircraft = await prisma.snapshotAircraft.findMany({
    where: {
      flight: { not: null },
      airlineId: null
    },
    select: {
      id: true,
      flight: true
    }
  });

  console.log(`Found ${unlinkedAircraft.length} aircraft observations without airline links\n`);

  let matched = 0;
  let unmatched = 0;
  let updated = 0;
  const unmatchedCodes = new Set();
  const matchedCodes = new Map();

  // Process in batches to avoid overwhelming the database
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < unlinkedAircraft.length; i += BATCH_SIZE) {
    const batch = unlinkedAircraft.slice(i, i + BATCH_SIZE);
    
    for (const aircraft of batch) {
      const flight = aircraft.flight?.trim();
      if (!flight) continue;

      // Extract airline code (2-3 letters before numbers)
      const match = flight.match(/^([A-Z]{2,3})\d+$/);
      if (match) {
        const icaoCode = match[1];
        const airlineId = icaoToAirlineId.get(icaoCode);

        if (airlineId) {
          // Update the aircraft record
          await prisma.snapshotAircraft.update({
            where: { id: aircraft.id },
            data: { airlineId }
          });
          
          matched++;
          updated++;
          
          // Track which codes we matched
          if (!matchedCodes.has(icaoCode)) {
            matchedCodes.set(icaoCode, 0);
          }
          matchedCodes.set(icaoCode, matchedCodes.get(icaoCode) + 1);
        } else {
          unmatched++;
          unmatchedCodes.add(icaoCode);
        }
      }
    }

    // Progress indicator
    if ((i + BATCH_SIZE) % 500 === 0) {
      console.log(`Processed ${Math.min(i + BATCH_SIZE, unlinkedAircraft.length)} / ${unlinkedAircraft.length} aircraft...`);
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Aircraft observations processed: ${unlinkedAircraft.length}`);
  console.log(`Successfully matched and linked: ${matched}`);
  console.log(`Could not match: ${unmatched}`);
  console.log(`Database updates performed: ${updated}`);

  if (matchedCodes.size > 0) {
    console.log("\n=== Top Matched Airlines ===");
    const sorted = Array.from(matchedCodes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    
    for (const [code, count] of sorted) {
      const airline = airlines.find(a => a.icaoCode === code);
      console.log(`  ${code.padEnd(5)} → ${count.toString().padStart(5)} aircraft (${airline?.callsign || 'Unknown'})`);
    }
  }

  if (unmatchedCodes.size > 0) {
    console.log(`\n=== Unmatched Airline Codes (${unmatchedCodes.size} unique) ===`);
    console.log(`  ${Array.from(unmatchedCodes).sort().join(', ')}`);
    console.log("\nNote: These airlines are not in the database. You may want to add them.");
  }

  // Final statistics
  console.log("\n=== Overall Database Statistics ===");
  const totalWithFlight = await prisma.snapshotAircraft.count({
    where: { flight: { not: null } }
  });
  const withAirlineId = await prisma.snapshotAircraft.count({
    where: { 
      flight: { not: null },
      airlineId: { not: null }
    }
  });
  const withoutAirlineId = totalWithFlight - withAirlineId;

  console.log(`Total aircraft with flight callsign: ${totalWithFlight}`);
  console.log(`  - WITH airline ID: ${withAirlineId} (${((withAirlineId / totalWithFlight) * 100).toFixed(2)}%)`);
  console.log(`  - WITHOUT airline ID: ${withoutAirlineId} (${((withoutAirlineId / totalWithFlight) * 100).toFixed(2)}%)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

