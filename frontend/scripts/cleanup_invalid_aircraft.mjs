import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

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

function buildInvalidFilter() {
  return {
    AND: [
      { OR: [{ registration: null }, { registration: '' }] },
      { OR: [{ model: null }, { model: '' }] },
    ],
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const dryRun = Boolean(args.dry || args['dry-run']);

  const invalidFilter = buildInvalidFilter();

  const toDelete = await prisma.aircraft.findMany({
    where: invalidFilter,
    select: { id: true },
  });

  const aircraftIds = toDelete.map((a) => a.id);
  console.error(`Identified ${aircraftIds.length} invalid Aircraft rows`);

  if (aircraftIds.length === 0) {
    console.error('Nothing to delete.');
    return;
  }

  const dependentCount = await prisma.snapshotAircraft.count({
    where: { aircraftId: { in: aircraftIds } },
  });
  console.error(`Found ${dependentCount} dependent SnapshotAircraft rows`);

  if (dryRun) {
    console.error('Dry run only. No changes made.');
    return;
  }

  const [deletedObs, deletedAc] = await prisma.$transaction([
    prisma.snapshotAircraft.deleteMany({ where: { aircraftId: { in: aircraftIds } } }),
    prisma.aircraft.deleteMany({ where: invalidFilter }),
  ]);

  console.error(`Deleted ${deletedObs.count} SnapshotAircraft and ${deletedAc.count} Aircraft.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


