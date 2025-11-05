import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ICAO airline code to callsign mapping (from BlankMap.tsx)
const AIRLINE_CALLSIGNS = {
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

// Airline names mapping (more complete names)
const AIRLINE_NAMES = {
  AAL: "American Airlines",
  UAL: "United Airlines",
  DAL: "Delta Air Lines",
  SWA: "Southwest Airlines",
  JBU: "JetBlue Airways",
  ASA: "Alaska Airlines",
  SKW: "SkyWest Airlines",
  EDV: "Endeavor Air",
  RPA: "Republic Airways",
  FFT: "Frontier Airlines",
  NKS: "Spirit Airlines",
  AAY: "Allegiant Air",
  JIA: "PSA Airlines",
  PDT: "Piedmont Airlines",
  ENY: "Envoy Air",
  
  ASH: "Air Shuttle",
  CHQ: "Chautauqua Airlines",
  CPZ: "Compass Airlines",
  FLG: "Flagship",
  GJS: "GoJet Airlines",
  JZA: "Jazz Aviation",
  MES: "Mesaba Airlines",
  QXE: "Horizon Air",
  RVJ: "Air Canada Jazz",
  TCF: "Shuttle America",
  UCA: "CommutAir",
  
  FDX: "FedEx Express",
  UPS: "United Parcel Service",
  GTI: "Atlas Air",
  ABX: "ABX Air",
  ATN: "Ameristar Air Cargo",
  
  ACA: "Air Canada",
  AFR: "Air France",
  BAW: "British Airways",
  DLH: "Lufthansa",
  KLM: "KLM Royal Dutch Airlines",
  SWR: "Swiss International Air Lines",
  AUA: "Austrian Airlines",
  SAS: "Scandinavian Airlines",
  IBE: "Iberia",
  TAP: "TAP Air Portugal",
  AZA: "Alitalia",
  LOT: "LOT Polish Airlines",
  ANA: "All Nippon Airways",
  JAL: "Japan Airlines",
  KAL: "Korean Air",
  CES: "China Eastern Airlines",
  CSN: "China Southern Airlines",
  CCA: "Air China",
  UAE: "Emirates",
  QTR: "Qatar Airways",
  ETD: "Etihad Airways",
  MEA: "Middle East Airlines",
  ELY: "El Al Israel Airlines",
  MSR: "EgyptAir",
  THY: "Turkish Airlines",
  SAA: "South African Airways",
  QFA: "Qantas",
  ANZ: "Air New Zealand",
  AIC: "Air India",
  BMA: "bmibaby",
  VIR: "Virgin Atlantic",
  NAX: "Norwegian Air Shuttle",
  
  AMX: "Aeroméxico",
  AVA: "Avianca",
  CMP: "Copa Airlines",
  TAM: "TAM Airlines",
  GOL: "Gol Transportes Aéreos",
  
  EJA: "NetJets",
  EJM: "Executive Jet Management",
  NJE: "NetJets Europe",
  FLX: "Flexjet",
  XOJ: "XOJET",
  TMC: "Travel Management Company",
  LXJ: "Flexjet",
  OPT: "Flight Options",
  JRE: "Jet Ride",
  JRT: "Jet Ride",
  VJA: "VistaJet",
  MVP: "Mountain View Aviation",
  PTR: "Patriot Air",
  LYM: "Key Lime Air",
  CXK: "ATP Flight School",
  GPD: "Tradewind Aviation",
  
  ROU: "Air Canada Rouge",
  KQA: "Kenya Airways",
  VIV: "Aero Viva",
  XEN: "Xen Air",
  ERY: "easyJet Europe",
  ITY: "ITA Airways",
  CFG: "Condor",
  RVF: "Raven Flight",
  ELZ: "El Al",
  KAP: "Cape Air",
  BTA: "BizJet"
};

async function main() {
  console.log("\n=== Populating Airline Callsigns in Database ===\n");

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const [icaoCode, callsign] of Object.entries(AIRLINE_CALLSIGNS)) {
    try {
      // Check if airline already exists
      const existing = await prisma.airline.findUnique({
        where: { icaoCode }
      });

      const name = AIRLINE_NAMES[icaoCode] || null;

      if (existing) {
        // Update if callsign is different or missing
        if (!existing.callsign || existing.callsign !== callsign || (!existing.name && name)) {
          await prisma.airline.update({
            where: { icaoCode },
            data: {
              callsign,
              name: name || existing.name
            }
          });
          console.log(`✓ Updated: ${icaoCode.padEnd(5)} → ${callsign.padEnd(20)} (${name || existing.name || 'N/A'})`);
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Create new airline
        await prisma.airline.create({
          data: {
            icaoCode,
            callsign,
            name
          }
        });
        console.log(`+ Created: ${icaoCode.padEnd(5)} → ${callsign.padEnd(20)} (${name || 'N/A'})`);
        created++;
      }
    } catch (error) {
      console.error(`✗ Error processing ${icaoCode}:`, error.message);
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no changes): ${skipped}`);
  console.log(`Total airlines in mapping: ${Object.keys(AIRLINE_CALLSIGNS).length}`);

  // Show total airlines in database
  const totalInDb = await prisma.airline.count();
  console.log(`Total airlines in database: ${totalInDb}`);

  // Show how many have callsigns now
  const withCallsigns = await prisma.airline.count({
    where: {
      callsign: { not: null }
    }
  });
  console.log(`Airlines with callsigns: ${withCallsigns} (${((withCallsigns / totalInDb) * 100).toFixed(1)}%)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

