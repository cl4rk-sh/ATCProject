# Database Population Summary

## Overview
Created and ran two scripts to populate the database with airline callsign information and link aircraft observations to their airlines.

## Results

### Before
- **Airline records in database:** 56
- **Airlines with callsigns:** ~30
- **Aircraft with airline ID:** 8,800 (12.77%)
- **Aircraft without airline ID:** 60,109 (87.23%)

### After
- **Airline records in database:** 99 ✨ (+43 new airlines)
- **Airlines with callsigns:** 99 (100%) ✨
- **Aircraft with airline ID:** 54,178 (78.62%) ✨ (+45,378 linked!)
- **Aircraft without airline ID:** 14,731 (21.38%)

## Scripts Created

### 1. `populate_airline_callsigns.mjs`
**Purpose:** Populates the database with airline ICAO codes and their callsigns

**What it does:**
- Adds 95 airlines to the database with their callsigns
- Includes US majors, regionals, cargo, international, and business aviation
- Updates existing airlines with missing callsign information
- Adds proper airline names

**Results:**
- ✅ Created: 43 new airlines
- ✅ Updated: 23 existing airlines
- ✅ Skipped: 29 (no changes needed)
- ✅ 100% of airlines now have callsigns

### 2. `link_aircraft_to_airlines.mjs`
**Purpose:** Links aircraft observations to airlines based on flight callsigns

**What it does:**
- Extracts airline ICAO codes from flight callsigns (e.g., "UAL" from "UAL125")
- Matches them against the airline database
- Updates the `airlineId` field for matching aircraft observations
- Processes in batches to handle large datasets efficiently

**Results:**
- ✅ Processed: 60,109 aircraft observations
- ✅ Successfully linked: 45,378 aircraft
- ✅ Improved coverage from 12.77% to 78.62%

## Top Airlines by Aircraft Count

| ICAO | Callsign | Aircraft Observations |
|------|----------|----------------------|
| RPA  | BRICKYARD | 6,966 |
| DAL  | DELTA | 5,609 |
| JBU  | JETBLUE | 4,608 |
| EJA  | EXECJET | 4,498 |
| UAL  | UNITED | 4,494 |
| AAL  | AMERICAN | 3,537 |
| EDV  | ENDEAVOR | 3,444 |
| SWA  | SOUTHWEST | 1,255 |
| FFT  | FRONTIER | 936 |

## Impact on Map Display

### Before
- Only 12.77% of aircraft showed airline names
- `UAL43` was pronounced as "Uniform Alpha Lima four three"

### After
- Frontend: **100%** coverage using static mapping
- Database: **78.62%** of aircraft linked to airlines
- `UAL43` now pronounced correctly as "UNITED four three"
- Airline names display when hovering over aircraft

## Remaining Work

The 21.38% of aircraft without airline IDs are primarily:
- **N-numbers** (US tail numbers): ~14,000 observations
- **Unknown/rare airline codes**: Very few

These aircraft still display correct pronunciations on the frontend due to the static ICAO code mapping.

## Usage

To run the scripts manually:

```bash
# 1. Populate airline callsigns
cd frontend
node scripts/populate_airline_callsigns.mjs

# 2. Link aircraft to airlines
node scripts/link_aircraft_to_airlines.mjs
```

**Note:** Run these scripts in order. The second script depends on the airlines being in the database first.

## Future Enhancements

1. **Automatic updates**: Run these scripts as part of data import pipeline
2. **More airlines**: Add additional regional and international airlines as needed
3. **IATA codes**: Consider adding IATA codes for additional airline identification
4. **Historical data**: Track airline callsign changes over time

