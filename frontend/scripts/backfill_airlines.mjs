#!/usr/bin/env node

// Backfill airlineId on SnapshotAircraft from flight prefixes using Airline.icaoCode

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error", "warn"] });

function deriveIcaoFromFlight(flight) {
  if (!flight) return null;
  const m = String(flight).trim().match(/^([A-Z]{2,3})\d+/i);
  return m ? m[1].toUpperCase() : null;
}

async function loadAirlineCodeToId() {
  const rows = await prisma.airline.findMany({ select: { id: true, icaoCode: true } });
  const map = new Map();
  for (const r of rows) map.set(r.icaoCode.toUpperCase(), r.id);
  return map;
}

function parseArgs(argv) {
  const args = { batchSize: 1000, maxBatches: null, maxRows: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--batch-size") args.batchSize = Number(argv[++i]);
    else if (a === "--max-batches") args.maxBatches = Number(argv[++i]);
    else if (a === "--max-rows") args.maxRows = Number(argv[++i]);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const batchSize = Number.isFinite(args.batchSize) && args.batchSize > 0 ? args.batchSize : 1000;
  let total = 0;
  const airlineMap = await loadAirlineCodeToId();
  let lastId = 0;
  let batches = 0;
  while (true) {
    const rows = await prisma.snapshotAircraft.findMany({
      where: { airlineId: null, flight: { not: null }, id: { gt: lastId } },
      select: { id: true, flight: true },
      take: batchSize,
      orderBy: { id: "asc" },
    });
    if (rows.length === 0) break;

    const updates = [];
    for (const r of rows) {
      const icao = deriveIcaoFromFlight(r.flight);
      if (!icao) continue;
      const airlineId = airlineMap.get(icao) ?? null;
      if (!airlineId) continue;
      updates.push(prisma.snapshotAircraft.update({ where: { id: r.id }, data: { airlineId } }));
    }
    if (updates.length) await prisma.$transaction(updates);
    total += rows.length;
    batches += 1;
    console.log(`Updated ${updates.length} of ${rows.length} in this batch; total scanned ${total}`);
    lastId = rows[rows.length - 1].id;
    if (rows.length < batchSize) break;
    if (args.maxBatches && batches >= args.maxBatches) break;
    if (args.maxRows && total >= args.maxRows) break;
  }
  console.log(`Processed ${total} snapshot aircraft rows for airline backfill`);
}

main()
  .catch(async (err) => {
    console.error(err);
    try { await prisma.$disconnect(); } catch {}
    process.exit(1);
  })
  .finally(async () => {
    try { await prisma.$disconnect(); } catch {}
  });


