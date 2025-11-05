#!/usr/bin/env node

// Import Airline rows from backend/flight_airline_callsign.xlsx into Prisma Airline model.
// Usage examples:
//   node scripts/import_airlines.mjs
//   node scripts/import_airlines.mjs --file ../../backend/flight_airline_callsign.xlsx
//   node scripts/import_airlines.mjs --dry-run

import fs from "fs";
import path from "path";
import url from "url";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient({ log: ["error", "warn"] });

function parseArgs(argv) {
  const args = { file: null, dryRun: false, limit: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") args.file = argv[++i];
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--help") {
      console.log("Usage: [--file PATH] [--limit N] [--dry-run]");
      process.exit(0);
    }
  }
  return args;
}

function defaultExcelPath() {
  return path.resolve(__dirname, "../../backend/flight_airline_callsign.xlsx");
}

function readWorksheetRows(filePath) {
  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf, { type: "buffer" });
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  return rows;
}

function normalizeString(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

async function upsertAirline(row) {
  const icaoCode = normalizeString(row["ICAO Code"]) || normalizeString(row["ICAO"]) || normalizeString(row["ICAOCode"]) || null;
  if (!icaoCode) return { skipped: true, reason: "missing icao" };
  const callsign = normalizeString(row["Callsign"]) || null;
  const name = normalizeString(row["Airline Name"]) || normalizeString(row["Airline"]) || null;
  const iataCode = normalizeString(row["IATA Code"]) || normalizeString(row["IATA"]) || null;

  await prisma.airline.upsert({
    where: { icaoCode },
    create: { icaoCode, callsign, name, iataCode },
    update: { callsign: callsign ?? undefined, name: name ?? undefined, iataCode: iataCode ?? undefined },
  });
  return { skipped: false };
}

async function main() {
  const args = parseArgs(process.argv);
  const filePath = path.resolve(args.file || defaultExcelPath());
  if (!fs.existsSync(filePath)) {
    console.error(`Excel file not found: ${filePath}`);
    process.exit(1);
  }

  const rows = readWorksheetRows(filePath);
  let processed = 0;
  let written = 0;

  for (const row of rows) {
    if (args.limit != null && processed >= args.limit) break;
    processed += 1;
    if (args.dryRun) continue;
    const res = await upsertAirline(row);
    if (!res.skipped) written += 1;
  }

  if (args.dryRun) {
    console.log(`DRY-RUN would process ${rows.length} rows`);
  } else {
    console.log(`Processed ${processed} rows, upserted ${written} airlines`);
  }
}

main()
  .catch(async (err) => {
    console.error(err);
    try {
      await prisma.$disconnect();
    } catch {}
    process.exit(1);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {}
  });



