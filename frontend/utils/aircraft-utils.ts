import type { Aircraft } from "@/types/aircraft";
import { PHONETIC_ALPHABET, AIRLINE_CALLSIGNS } from "./aircraft-constants";

// Function to generate pronunciation for aircraft callsign
export function getPronunciation(flight: string | null | undefined, airline: Aircraft["airline"]): string {
  if (!flight || !flight.trim()) return "Unknown";
  
  const trimmed = flight.trim();
  
  // Check if it's a tail number (starts with N) - handle this first
  if (trimmed.startsWith("N")) {
    // N-number: spell out using phonetic alphabet
    const letters: string[] = [];
    const chars = trimmed.substring(1); // Skip the N
    
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i].toUpperCase();
      if (char >= 'A' && char <= 'Z') {
        letters.push(PHONETIC_ALPHABET[char] || char);
      } else if (char >= '0' && char <= '9') {
        letters.push(char); // Just say the number
      }
    }
    
    return `November ${letters.join(" ")}`;
  }
  
  // Try to extract airline code and flight number
  const codeMatch = trimmed.match(/^([A-Z]+)(\d+)$/);
  if (codeMatch) {
    const code = codeMatch[1];
    const numbers = codeMatch[2];
    
    // Read numbers individually (e.g., "125" -> "one two five")
    const numWords = numbers.split("").map(d => {
      const nums = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
      return nums[parseInt(d)] || d;
    }).join(" ");
    
    // Try to find airline callsign from our mapping first (most reliable)
    if (AIRLINE_CALLSIGNS[code]) {
      return `${AIRLINE_CALLSIGNS[code]} ${numWords}`;
    }
    
    // If we have airline data from database, use it
    if (airline && airline.callsign) {
      return `${airline.callsign} ${numWords}`;
    }
    
    // Fallback: spell out the airline code letters phonetically
    const codePhonetic = code.split("").map(c => PHONETIC_ALPHABET[c] || c).join(" ");
    return `${codePhonetic} ${numWords}`;
  }
  
  // Fallback: just return the original
  return trimmed;
}

// Filter planes based on search query
export function filterPlanes(planesToFilter: Aircraft[], searchQuery: string): Aircraft[] {
  if (!searchQuery.trim()) return planesToFilter;
  
  const query = searchQuery.trim().toLowerCase();
  
  return planesToFilter.filter((p) => {
    // Search by pronunciation
    const pronunciation = getPronunciation(p.flight, p.airline).toLowerCase();
    if (pronunciation.includes(query)) return true;
    
    // Search by callsign/flight number
    const flight = (p.flight ?? "").toLowerCase();
    if (flight.includes(query)) return true;
    
    // Search by airline name
    if (p.airline?.name) {
      const airlineName = p.airline.name.toLowerCase();
      if (airlineName.includes(query)) return true;
    }
    
    // Search by airline ICAO code
    if (p.airline?.icaoCode) {
      const icaoCode = p.airline.icaoCode.toLowerCase();
      if (icaoCode.includes(query)) return true;
    }
    
    // Search by airline callsign
    if (p.airline?.callsign) {
      const callsign = p.airline.callsign.toLowerCase();
      if (callsign.includes(query)) return true;
    }
    
    // Search by hex (aircraft identifier)
    if (p.hex) {
      const hex = p.hex.toLowerCase();
      if (hex.includes(query)) return true;
    }
    
    return false;
  });
}

// Helper functions for aircraft calculations
export const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

export const toHeading = (p: Aircraft) =>
  typeof p.track === "number"
    ? p.track
    : typeof p.true_heading === "number"
    ? p.true_heading
    : typeof p.nav_heading === "number"
    ? p.nav_heading
    : 0;

export const projectEndpoint = (lat: number, lon: number, bearingDeg: number, distanceM: number) => {
  const R = 6371000; // meters
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const angDist = distanceM / R;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angDist) + Math.cos(lat1) * Math.sin(angDist) * Math.cos(brng)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(angDist) * Math.cos(lat1),
      Math.cos(angDist) - Math.sin(lat1) * Math.sin(lat2)
    );
  return [(lat2 * 180) / Math.PI, ((lon2 * 180) / Math.PI + 540) % 360 - 180] as [number, number];
};

