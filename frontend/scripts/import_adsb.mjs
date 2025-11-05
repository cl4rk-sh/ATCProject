#!/usr/bin/env node

// Import ADS-B JSON files from backend/adsb_data into Prisma models.
// Usage examples:
//   node scripts/import_adsb.mjs --dir ../../backend/adsb_data --limit 50
//   node scripts/import_adsb.mjs --file ../../backend/adsb_data/adsb_20251008T173000Z.json

import fs from "fs";
import path from "path";
import url from "url";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient({ log: ["error", "warn"] });
let airlineCodeToId = null;

async function loadAirlineCodeToId() {
  if (airlineCodeToId) return airlineCodeToId;
  const rows = await prisma.airline.findMany({ select: { id: true, icaoCode: true } });
  const map = new Map();
  for (const r of rows) map.set(r.icaoCode.toUpperCase(), r.id);
  airlineCodeToId = map;
  return airlineCodeToId;
}

function parseArgs(argv) {
  const args = { dir: null, file: null, limit: null, dryRun: false, from: null, to: null, resume: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dir") args.dir = argv[++i];
    else if (a === "--file") args.file = argv[++i];
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--from") args.from = argv[++i];
    else if (a === "--to") args.to = argv[++i];
    else if (a === "--resume") args.resume = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--help") {
      console.log("Usage: --dir <path>|--file <path> [--from DATE] [--to DATE] [--limit N] [--resume] [--dry-run]");
      process.exit(0);
    }
  }
  return args;
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function parseCompactOrIsoToDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  // Accept YYYYMMDDTHHMMSSZ
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (m) {
    const [_, y, mo, d, h, mi, se] = m;
    const iso = `${y}-${mo}-${d}T${h}:${mi}:${se}Z`;
    return new Date(iso);
  }
  return toDate(s);
}

function toInt(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? n : null;
}

function toFloat(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function coerceAltBaro(raw) {
  if (raw === null || raw === undefined) return { altBaroRaw: null, altBaroFt: null };
  if (typeof raw === "number") return { altBaroRaw: String(raw), altBaroFt: Math.trunc(raw) };
  // Could be "ground" or other strings
  return { altBaroRaw: String(raw), altBaroFt: null };
}

function deriveSnapshotMeta(json) {
  const meta = json._meta || {};
  const capturedAt = toDate(meta.captured_at) || (json.now ? new Date(json.now) : new Date());
  const centerLat = meta.center?.lat != null ? toFloat(meta.center.lat) : null;
  const centerLon = meta.center?.lon != null ? toFloat(meta.center.lon) : null;
  const radiusNm = meta.radius_nm != null ? toFloat(meta.radius_nm) : null;
  const endpoint = meta.endpoint ?? null;
  const total = json.total != null ? toInt(json.total) : null;
  const providerNowMs = json.now != null ? BigInt(json.now) : null;
  return { capturedAt, centerLat, centerLon, radiusNm, endpoint, total, providerNowMs };
}

function mapSnapshotAircraft(ac, aircraftId, snapshotId, airlineMap) {
  const { altBaroRaw, altBaroFt } = coerceAltBaro(ac.alt_baro);
  // Derive airline ICAO from flight prefix (letters before digits)
  let airlineIcao = null;
  if (ac.flight) {
    const m = String(ac.flight).match(/^([A-Z]{2,3})\d+/i);
    if (m) airlineIcao = m[1].toUpperCase();
  }
  const airlineId = airlineIcao && airlineMap ? airlineMap.get(airlineIcao) ?? null : null;
  return {
    snapshotId,
    aircraftId,
    type: ac.type ?? null,
    flight: ac.flight ?? null,
    airlineId: airlineId ?? null,
    registration: ac.r ?? null,
    model: ac.t ?? null,
    altBaroRaw,
    altBaroFt,
    altGeomFt: toInt(ac.alt_geom),
    gsKts: toFloat(ac.gs),
    trackDeg: toFloat(ac.track),
    trueHeadingDeg: toFloat(ac.true_heading),
    baroRateFpm: toInt(ac.baro_rate),
    geomRateFpm: toInt(ac.geom_rate),
    squawk: ac.squawk ?? null,
    emergency: ac.emergency ?? null,
    category: ac.category ?? null,
    lat: toFloat(ac.lat),
    lon: toFloat(ac.lon),
    nic: toInt(ac.nic),
    rc: toInt(ac.rc),
    version: toInt(ac.version),
    nac_p: toInt(ac.nac_p),
    nac_v: toInt(ac.nac_v),
    sil: toInt(ac.sil),
    sil_type: ac.sil_type ?? null,
    gva: toInt(ac.gva),
    sda: toInt(ac.sda),
    alert: ac.alert != null ? Boolean(ac.alert) : null,
    spi: ac.spi != null ? Boolean(ac.spi) : null,
    messages: toInt(ac.messages),
    seenSeconds: ac.seen != null ? Number(ac.seen) : null,
    rssi: toFloat(ac.rssi),
    dstNm: toFloat(ac.dst),
    dirDeg: toFloat(ac.dir),
    nav_qnh_hpa: toFloat(ac.nav_qnh),
    nav_altitude_mcp: toInt(ac.nav_altitude_mcp),
    nav_heading_deg: toFloat(ac.nav_heading),
    nav_modes: Array.isArray(ac.nav_modes) ? ac.nav_modes : [],
    mlat: Array.isArray(ac.mlat) ? ac.mlat : null,
    tisb: Array.isArray(ac.tisb) ? ac.tisb : null,
    extra: null,
  };
}

async function upsertAircraft(aircraftId, registration, model) {
  return prisma.aircraft.upsert({
    where: { id: aircraftId },
    create: {
      id: aircraftId,
      registration: registration ?? null,
      model: model ?? null,
    },
    update: {
      // keep most recent seen registration/model
      registration: registration ?? undefined,
      model: model ?? undefined,
    },
  });
}

async function importFile(filePath, options) {
  const text = fs.readFileSync(filePath, "utf-8");
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON: ${filePath}`);
  }

  const meta = deriveSnapshotMeta(json);

  // If snapshot with this capturedAt already exists, skip for idempotency
  const existing = await prisma.snapshot.findFirst({ where: { capturedAt: meta.capturedAt }, select: { id: true } });
  if (existing) {
    console.log(`Skip existing snapshot at ${meta.capturedAt.toISOString()} (${path.basename(filePath)})`);
    return;
  }

  if (options.dryRun) {
    console.log(`DRY-RUN snapshot @ ${meta.capturedAt.toISOString()} with total=${meta.total}`);
    return;
  }

  // Create snapshot first
  const snapshot = await prisma.snapshot.create({
    data: {
      capturedAt: meta.capturedAt,
      centerLat: meta.centerLat,
      centerLon: meta.centerLon,
      radiusNm: meta.radiusNm,
      endpoint: meta.endpoint,
      total: meta.total,
      providerNowMs: meta.providerNowMs,
    },
  });

  const aircraftArray = Array.isArray(json.ac) ? json.ac : [];

  // Upsert aircraft master records
  const aircraftUnique = new Map();
  for (const ac of aircraftArray) {
    const hex = String(ac.hex || "").trim();
    if (!hex) continue;
    if (!aircraftUnique.has(hex)) {
      aircraftUnique.set(hex, { registration: ac.r ?? null, model: ac.t ?? null });
    }
  }

  // Batch upsert aircraft (sequential to avoid DB connection explosion)
  for (const [aircraftId, metaVals] of aircraftUnique.entries()) {
    await upsertAircraft(aircraftId, metaVals.registration, metaVals.model);
  }

  // Prepare SnapshotAircraft records
  const rows = [];
  const airlineMap = await loadAirlineCodeToId();
  for (const ac of aircraftArray) {
    const aircraftId = String(ac.hex || "").trim();
    if (!aircraftId) continue;
    rows.push(mapSnapshotAircraft(ac, aircraftId, snapshot.id, airlineMap));
  }

  // Insert in chunks for efficiency
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;
    await prisma.snapshotAircraft.createMany({ data: chunk, skipDuplicates: true });
  }

  console.log(
    `Imported snapshot ${snapshot.id} at ${snapshot.capturedAt.toISOString()} with ${rows.length} aircraft`
  );
}

function listJsonFiles(dir) {
  const names = fs.readdirSync(dir).filter((n) => n.endsWith(".json"));
  names.sort();
  return names.map((n) => path.join(dir, n));
}

function capturedAtFromFilename(filePath) {
  const base = path.basename(filePath);
  // adsb_YYYYMMDDTHHMMSSZ.json
  const m = base.match(/adsb_(\d{8}T\d{6}Z)\.json$/);
  if (m) return parseCompactOrIsoToDate(m[1]);
  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  const defaultDataDir = path.resolve(__dirname, "../../backend/adsb_data");
  const targetDir = args.dir ? path.resolve(args.dir) : defaultDataDir;

  try {
    let fromDate = parseCompactOrIsoToDate(args.from);
    const toDateFilter = parseCompactOrIsoToDate(args.to);

    if (args.resume && !fromDate) {
      const latest = await prisma.snapshot.findFirst({ orderBy: { capturedAt: "desc" }, select: { capturedAt: true } });
      if (latest?.capturedAt) {
        // start just after the latest capturedAt
        fromDate = new Date(latest.capturedAt.getTime() + 1);
        console.log(`Resume enabled. Starting after ${latest.capturedAt.toISOString()}`);
      }
    }

    if (args.file) {
      const fp = path.resolve(args.file);
      await importFile(fp, { dryRun: args.dryRun });
    } else {
      const files = listJsonFiles(targetDir);
      let filtered = files;
      if (fromDate || toDateFilter) {
        filtered = files.filter((fp) => {
          const ts = capturedAtFromFilename(fp);
          if (!ts) return true; // keep if unknown
          if (fromDate && ts < fromDate) return false;
          if (toDateFilter && ts > toDateFilter) return false;
          return true;
        });
      }
      const limited = typeof args.limit === "number" ? filtered.slice(0, args.limit) : filtered;
      for (const fp of limited) {
        try {
          await importFile(fp, { dryRun: args.dryRun });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(`Skipping file due to error: ${path.basename(fp)} → ${message}`);
        }
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (err) => {
  console.error(err);
  try { await prisma.$disconnect(); } catch {}
  process.exit(1);
});


