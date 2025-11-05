import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient({ log: ['error', 'warn'] });

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const [key, value] = arg.split('=');
      const k = key.replace(/^--/, '');
      if (typeof value === 'string' && value.length > 0) {
        args[k] = value;
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        args[k] = argv[++i];
      } else {
        args[k] = true;
      }
    }
  }
  return args;
}

function csvEscape(value) {
  if (value == null) return '';
  const str = String(value);
  const needsQuotes = /[",\n\r]/.test(str) || str.includes(',');
  const escaped = str.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

async function main() {
  const args = parseArgs(process.argv);
  const outPathArg = args.out || args.output;
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
  const outFile = outPathArg || `unique_flights_${timestamp}.csv`;
  const outPath = path.isAbsolute(outFile)
    ? outFile
    : path.join(process.cwd(), outFile);

  // Query distinct flights; pick registration/model from either the snapshot row
  // or fall back to the related Aircraft if snapshot fields are null.
  const rows = await prisma.snapshotAircraft.findMany({
    where: { flight: { not: null } },
    distinct: ['flight'],
    select: {
      flight: true,
      registration: true,
      model: true,
      aircraft: { select: { registration: true, model: true } },
    },
    orderBy: { flight: 'asc' },
  });

  const records = rows.map(r => ({
    flight: r.flight ?? '',
    registration: r.registration ?? r.aircraft?.registration ?? '',
    model: r.model ?? r.aircraft?.model ?? '',
  }));

  const header = ['flight', 'registration', 'model'];
  const csvLines = [header.map(csvEscape).join(',')];
  for (const rec of records) {
    csvLines.push([rec.flight, rec.registration, rec.model].map(csvEscape).join(','));
  }
  const csv = csvLines.join('\n') + '\n';

  fs.writeFileSync(outPath, csv, 'utf8');
  // Also print to stdout for piping if desired
  process.stdout.write(csv);
  console.error(`Wrote ${records.length} rows to ${outPath}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


