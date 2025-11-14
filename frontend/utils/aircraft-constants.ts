import L from "leaflet";

// Bounds per user request:
// Longitude: 74°45'W to 73°15'W → lon = [-74.75, -73.25]
// Latitude: 40°15'N to 41°15'N → lat = [40.25, 41.25]
export const USER_BOUNDS: L.LatLngBoundsExpression = [
  [40.25, -74.75],
  [41.25, -73.25],
];

// Newark (KEWR) defaults from backend recorder/cli
export const NEWARK_CENTER: [number, number] = [40.6895, -74.1745];
export const RADIUS_NM_DEFAULT = 20; // nautical miles
export const METERS_PER_NM = 1852;
export const NEWARK_RADIUS_M = RADIUS_NM_DEFAULT * METERS_PER_NM;
export const RADIUS_2MI_M = 2 * 1609.34;

// Phonetic alphabet for spelling out letters
export const PHONETIC_ALPHABET: Record<string, string> = {
  A: "Alpha", B: "Bravo", C: "Charlie", D: "Delta", E: "Echo", F: "Foxtrot",
  G: "Golf", H: "Hotel", I: "India", J: "Juliet", K: "Kilo", L: "Lima",
  M: "Mike", N: "November", O: "Oscar", P: "Papa", Q: "Quebec", R: "Romeo",
  S: "Sierra", T: "Tango", U: "Uniform", V: "Victor", W: "Whiskey",
  X: "X-ray", Y: "Yankee", Z: "Zulu"
};

// ICAO airline code to callsign mapping (common airlines)
export const AIRLINE_CALLSIGNS: Record<string, string> = {
  // US Airlines
  AAL: "AMERICAN", UAL: "UNITED", DAL: "DELTA", SWA: "SOUTHWEST", JBU: "JETBLUE",
  ASA: "ALASKA", SKW: "SKYWEST", EDV: "ENDEAVOR", RPA: "BRICKYARD", FFT: "FRONTIER",
  NKS: "SPIRIT", AAY: "ALLEGIANT", JIA: "PSA", PDT: "PIEDMONT", ENY: "ENVOY",
  
  // Regional/Commuter
  ASH: "AIR SHUTTLE", CHQ: "CHAUTAUQUA", CPZ: "COMPASS", FLG: "FLAGSHIP",
  GJS: "GORJET", JZA: "JAZZ", MES: "MESABA", QXE: "HORIZON", RVJ: "AIR CANADA JAZZ",
  TCF: "SHUTTLE AMERICA", UCA: "COMMUTAIR", 
  
  // Cargo
  FDX: "FEDEX", UPS: "UPS", GTI: "GIANT", ABX: "ABEX", ATN: "AMERISTAR",
  
  // International
  ACA: "AIR CANADA", AFR: "AIR FRANCE", BAW: "SPEEDBIRD", DLH: "LUFTHANSA",
  KLM: "KLM", SWR: "SWISS", AUA: "AUSTRIAN", SAS: "SCANDINAVIAN",
  IBE: "IBERIA", TAP: "AIR PORTUGAL", AZA: "ALITALIA", LOT: "LOT",
  ANA: "ALL NIPPON", JAL: "JAPAN AIR", KAL: "KOREAN AIR", CES: "CHINA EASTERN",
  CSN: "CHINA SOUTHERN", CCA: "AIR CHINA", UAE: "EMIRATES", QTR: "QATARI",
  ETD: "ETIHAD", MEA: "CEDAR JET", ELY: "EL AL", MSR: "EGYPTAIR",
  THY: "TURKISH", SAA: "SPRINGBOK", QFA: "QANTAS", ANZ: "NEW ZEALAND",
  AIC: "AIR INDIA", BMA: "BMIBABY", VIR: "VIRGIN", NAX: "NORWEGIAN",
  
  // Latin America
  AMX: "AEROMEXICO", AVA: "AVIANCA", CMP: "COPA", TAM: "TAM", GOL: "GOL",
  
  // Business/Charter
  EJA: "EXECJET", EJM: "EXEC JET", NJE: "NET JETS", FLX: "FLEXJET",
  XOJ: "XOJET", TMC: "TMAC", LXJ: "FLEXJET", OPT: "OPTIONS", JRE: "JET RIDE",
  JRT: "JET RIDE", VJA: "VISTA", MVP: "MOUNTAIN VIEW", PTR: "PATRIOT",
  LYM: "KEY LIME", CXK: "CAREER TRACK", GPD: "TRADEWIND",
  
  // Misc
  ROU: "ROUGE", KQA: "KENYA", VIV: "AERO VIVA", XEN: "XEN AIR",
  ERY: "ERA", ITY: "ITA", CFG: "CONDOR", RVF: "RAVEN FLIGHT",
  ELZ: "EL AL", KAP: "CAPE AIR", BTA: "BIZJET"
};

