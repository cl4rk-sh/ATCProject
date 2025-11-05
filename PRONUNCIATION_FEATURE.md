# Aircraft Callsign Pronunciation Feature

## Overview
Added pronunciation information for aircraft callsigns on the map display, showing how ATC would pronounce each aircraft's callsign based on airline information and phonetic alphabet rules.

## Database Statistics
- **Total aircraft with flight callsign:** 68,909
- **Aircraft WITH airline ID:** 8,800 (12.77%)
- **Aircraft WITHOUT airline ID:** 60,109 (87.23%)

## Implementation

### 1. API Changes (`/app/api/snapshot/route.ts`)
- Added airline information to the snapshot API response
- Now returns: `icaoCode`, `callsign`, and `name` for each aircraft with an airline

### 2. Airline Callsign Mapping (`/components/BlankMap.tsx`)
- **Key improvement:** Created a comprehensive mapping of ICAO airline codes to their callsigns
- Includes 80+ airlines (US majors, regionals, cargo, international, business jets)
- **Works independently of database airline IDs** - extracts airline code from flight callsign
- Examples: UAL → "UNITED", DAL → "DELTA", JBU → "JETBLUE", EJA → "EXECJET"

### 3. Pronunciation Logic (`/components/BlankMap.tsx`)

The `getPronunciation()` function handles callsigns in this priority:

#### A. N-numbers (US tail numbers starting with N) - Checked First
Example: `N6069F`
- Pronunciation: **"November 6 0 6 9 Foxtrot"**
- Uses NATO phonetic alphabet for letters

#### B. Airline Callsigns (using ICAO code mapping) - Primary Method
Example: `UAL125` → extracts "UAL" → looks up in mapping
- Pronunciation: **"UNITED one two five"**
- Works for **all aircraft** regardless of database airline ID

#### C. Database Airline Callsign - Fallback
If the code isn't in our mapping but the aircraft has an airline ID in the database:
- Uses the callsign from the database

#### D. Phonetic Spelling - Final Fallback
For unknown airline codes:
Example: `XYZ123`
- Pronunciation: **"X-ray Yankee Zulu one two three"**
- Spells out the airline code using phonetic alphabet

### 4. Map Display
On hover, each aircraft marker shows:
- **Callsign** (e.g., "UAL125")
- **🔊 Pronunciation** (e.g., "UNITED one two five")
- **Airline name** (e.g., "United Airlines") - if available
- **Aircraft type** (e.g., "B78X")
- **Speed and altitude**

## Phonetic Alphabet Reference
The implementation uses the standard NATO phonetic alphabet:
- A = Alpha, B = Bravo, C = Charlie, D = Delta, E = Echo, F = Foxtrot
- G = Golf, H = Hotel, I = India, J = Juliet, K = Kilo, L = Lima
- M = Mike, N = November, O = Oscar, P = Papa, Q = Quebec, R = Romeo
- S = Sierra, T = Tango, U = Uniform, V = Victor, W = Whiskey
- X = X-ray, Y = Yankee, Z = Zulu

## Examples from the Data

### Airline Callsigns (now working for all aircraft):
- `UAL125` → "UNITED one two five" (United Airlines)
- `UAL43` → "UNITED four three" (United Airlines) ✓ **Fixed!**
- `DAL875` → "DELTA eight seven five" (Delta Air Lines)
- `JBU125` → "JETBLUE one two five" (JetBlue Airways) ✓ **Now works!**
- `EDV5296` → "ENDEAVOR five two nine six" (Endeavor Air) ✓ **Now works!**
- `EJA460` → "EXECJET four six zero" (NetJets)
- `SWA123` → "SOUTHWEST one two three" (Southwest Airlines)
- `AAL456` → "AMERICAN four five six" (American Airlines)

### N-numbers (tail numbers):
- `N6069F` → "November 6 0 6 9 Foxtrot"
- `N53576` → "November 5 3 5 7 6"
- `N453PT` → "November 4 5 3 Papa Tango"

### Unknown Airline Codes (phonetic fallback):
- `XYZ123` → "X-ray Yankee Zulu one two three"

## Solution to Original Issue

**Problem:** Aircraft like `UAL43` were being pronounced as "Uniform Alpha Lima four three" instead of "UNITED four three" because only 12.77% of aircraft had airline IDs in the database.

**Solution:** Created a comprehensive ICAO airline code to callsign mapping that works independently of database airline IDs. The system now:
1. Extracts the airline code from the flight callsign (e.g., "UAL" from "UAL43")
2. Looks it up in the static mapping
3. Returns the proper callsign pronunciation

This means `UAL43`, `DAL875`, `JBU125`, etc. all now pronounce correctly regardless of whether they have an airline ID in the database.

## Next Steps
Consider adding:
1. Audio playback of pronunciations
2. More airline codes to the mapping (currently 80+)
3. Special handling for common private aircraft operators
4. Regional airline callsign variations
5. International airline callsign variations by region

