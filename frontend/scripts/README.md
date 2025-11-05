# Database Management Scripts

This directory contains scripts for importing and managing ADS-B data and airline information in the PostgreSQL database.

## Scripts Overview

### Data Import Scripts

#### `import_adsb.mjs`
Imports ADS-B snapshot data from JSON files into the database.

```bash
node scripts/import_adsb.mjs
```

**What it does:**
- Reads JSON files from `../backend/adsb_data/`
- Creates snapshot records with timestamps
- Creates aircraft records (or updates existing ones)
- Links aircraft observations to snapshots
- Handles position data, altitude, speed, heading, etc.

---

### Airline Management Scripts

#### `populate_airline_callsigns.mjs` ⭐ NEW
Populates the database with airline ICAO codes and their callsigns.

```bash
node scripts/populate_airline_callsigns.mjs
```

**What it does:**
- Adds 95+ airlines to the database
- Includes callsigns for pronunciation (e.g., UAL → "UNITED")
- Updates existing airlines with missing information
- Covers US majors, regionals, cargo, international, and business aviation

**When to run:**
- After initial database setup
- When adding new airlines to the system
- To update airline callsigns

---

#### `link_aircraft_to_airlines.mjs` ⭐ NEW
Links aircraft observations to their airlines based on flight callsigns.

```bash
node scripts/link_aircraft_to_airlines.mjs
```

**What it does:**
- Extracts airline codes from flight callsigns (e.g., "UAL" from "UAL125")
- Matches them against the airline database
- Updates `airlineId` field for aircraft observations
- Processes 60,000+ observations in batches

**When to run:**
- After running `populate_airline_callsigns.mjs`
- After importing new ADS-B data
- To improve airline linkage coverage

**Note:** This script should be run AFTER `populate_airline_callsigns.mjs` to ensure airlines exist in the database.

---

#### `import_airlines.mjs`
Imports airline data from a CSV file.

```bash
node scripts/import_airlines.mjs
```

**What it does:**
- Reads airline data from CSV
- Creates airline records in the database
- Used for bulk airline imports

---

#### `backfill_airlines.mjs`
Backfills airline relationships for existing aircraft observations.

```bash
node scripts/backfill_airlines.mjs
```

**What it does:**
- Updates existing aircraft with airline information
- Links observations to airlines based on flight prefixes
- Similar to `link_aircraft_to_airlines.mjs` but for historical data

---

### Data Export Scripts

#### `export_unique_flights.mjs`
Exports unique flight callsigns from the database to a CSV file.

```bash
node scripts/export_unique_flights.mjs
```

**What it does:**
- Queries all unique flight callsigns
- Exports them to a CSV file with timestamp
- Useful for analysis and airline identification

---

### Cleanup Scripts

#### `cleanup_invalid_aircraft.mjs`
Removes invalid or malformed aircraft records.

```bash
node scripts/cleanup_invalid_aircraft.mjs
```

**What it does:**
- Identifies problematic aircraft records
- Removes duplicates or invalid entries
- Cleans up the database

---

## Recommended Workflow

### Initial Setup
```bash
# 1. Import ADS-B data
node scripts/import_adsb.mjs

# 2. Populate airlines with callsigns
node scripts/populate_airline_callsigns.mjs

# 3. Link aircraft to airlines
node scripts/link_aircraft_to_airlines.mjs
```

### Adding New Data
```bash
# 1. Import new ADS-B data
node scripts/import_adsb.mjs

# 2. Link new observations to airlines
node scripts/link_aircraft_to_airlines.mjs
```

### Maintenance
```bash
# Clean up invalid records
node scripts/cleanup_invalid_aircraft.mjs

# Export unique flights for analysis
node scripts/export_unique_flights.mjs
```

## Database Schema

The scripts interact with these main tables:

- **Aircraft**: Individual aircraft records (ICAO hex, registration, model)
- **Snapshot**: Time-stamped snapshots of ADS-B data
- **SnapshotAircraft**: Aircraft observations within snapshots
- **Airline**: Airline information (ICAO code, callsign, name)

## Environment

All scripts require:
- Node.js
- PostgreSQL database running
- `.env` file with `DATABASE_URL` configured
- Prisma Client generated

## Error Handling

All scripts include:
- Error logging to console
- Graceful database disconnection
- Exit codes for automation
- Progress indicators for long-running operations

## Performance

- **Batch processing**: Large operations are batched to avoid memory issues
- **Progress indicators**: Long-running scripts show progress
- **Transaction support**: Critical operations use database transactions
- **Efficient queries**: Optimized for large datasets (60,000+ records)

