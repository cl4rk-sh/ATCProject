"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  ImageOverlay,
  Circle,
  Polyline,
  useMapEvents,
  Tooltip,
} from "react-leaflet";
import L, { LatLngExpression, LatLngBoundsExpression } from "leaflet";
import { Slider } from "@heroui/slider";
import { Switch } from "@heroui/switch";
import { renderToStaticMarkup } from "react-dom/server";
import { FaPlane } from "react-icons/fa6";

// Fix default marker icons in Next.js bundling
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: (markerIcon as unknown as string),
  iconRetinaUrl: (markerIcon2x as unknown as string),
  shadowUrl: (markerShadow as unknown as string),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

type BlankMapProps = {
  /** Optional image URL to overlay on the map within the given bounds */
  overlayImageUrl?: string;
  /** Initial markers as [lat, lng] tuples */
  initialMarkers?: LatLngExpression[];
};

// Bounds per user request:
// Longitude: 74°45'W to 73°15'W → lon = [-74.75, -73.25]
// Latitude: 40°15'N to 41°15'N → lat = [40.25, 41.25]
const USER_BOUNDS: L.LatLngBoundsExpression = [
  [40.25, -74.75],
  [41.25, -73.25],
];

// Newark (KEWR) defaults from backend recorder/cli
const NEWARK_CENTER: [number, number] = [40.6895, -74.1745];
const RADIUS_NM_DEFAULT = 20; // nautical miles
const METERS_PER_NM = 1852;
const NEWARK_RADIUS_M = RADIUS_NM_DEFAULT * METERS_PER_NM;

// Phonetic alphabet for spelling out letters
const PHONETIC_ALPHABET: Record<string, string> = {
  A: "Alpha", B: "Bravo", C: "Charlie", D: "Delta", E: "Echo", F: "Foxtrot",
  G: "Golf", H: "Hotel", I: "India", J: "Juliet", K: "Kilo", L: "Lima",
  M: "Mike", N: "November", O: "Oscar", P: "Papa", Q: "Quebec", R: "Romeo",
  S: "Sierra", T: "Tango", U: "Uniform", V: "Victor", W: "Whiskey",
  X: "X-ray", Y: "Yankee", Z: "Zulu"
};

// ICAO airline code to callsign mapping (common airlines)
const AIRLINE_CALLSIGNS: Record<string, string> = {
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

// Function to generate pronunciation for aircraft callsign
function getPronunciation(flight: string | null | undefined, airline: Aircraft["airline"]): string {
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

type Aircraft = {
  hex?: string;
  lat?: number;
  lon?: number;
  track?: number;
  true_heading?: number;
  nav_heading?: number;
  t?: string;
  flight?: string;
  alt_baro?: number | string;
  gs?: number;
  airline?: {
    icaoCode: string;
    callsign: string | null;
    name: string | null;
  } | null;
};

export default function BlankMap({ overlayImageUrl, initialMarkers = [] }: BlankMapProps) {
  const [markers, setMarkers] = useState<LatLngExpression[]>(initialMarkers);
  const bounds = useMemo<LatLngBoundsExpression>(() => USER_BOUNDS, []);
  const [planes, setPlanes] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showNewarkBorders, setShowNewarkBorders] = useState<boolean>(true);
  const [showNewarkGround, setShowNewarkGround] = useState<boolean>(false);
  const [showOutsideGround, setShowOutsideGround] = useState<boolean>(false);

  // Time slider bounds (reuse API Playground range)
  const START_TS = "20251008T173000Z";
  const END_TS = "20251008T175958Z";
  const toIsoZ = (compact: string) =>
    `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}T${compact.slice(9, 11)}:${compact.slice(11, 13)}:${compact.slice(13, 15)}Z`;
  const startEpoch = useMemo(() => Math.floor(new Date(toIsoZ(START_TS)).getTime() / 1000), []);
  const endEpoch = useMemo(() => Math.floor(new Date(toIsoZ(END_TS)).getTime() / 1000), []);
  const [epochSeconds, setEpochSeconds] = useState<number>(startEpoch);
  const [sliderValue, setSliderValue] = useState<number>(startEpoch);

  const fetchPlanes = async (epoch: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ts: String(epoch) });
      const res = await fetch(`/api/snapshot?${params.toString()}`);
      const json = await res.json();
      const ac: Aircraft[] = (json?.aircraft ?? []) as Aircraft[];
      setPlanes(ac.filter((p) => typeof p.lat === "number" && typeof p.lon === "number"));
    } catch (err) {
      setPlanes([]);
    } finally {
      setLoading(false);
    }
  };

  const [hoverHex, setHoverHex] = useState<string | null>(null);
  const [hoverPath, setHoverPath] = useState<Array<[number, number]>>([]);

  useEffect(() => {
    let active = true;
    async function loadPath(hex?: string | null) {
      if (!hex) {
        setHoverPath([]);
        return;
      }
      try {
        const res = await fetch(`/api/aircraft/route?hex=${encodeURIComponent(hex)}&minutes=15&max=200&ts=${encodeURIComponent(String(epochSeconds))}`);
        const json = await res.json();
        if (!active) return;
        const pts = Array.isArray(json?.points)
          ? json.points
              .filter((p: any) => typeof p.lat === "number" && typeof p.lon === "number")
              .map((p: any) => [p.lat as number, p.lon as number] as [number, number])
          : [];
        setHoverPath(pts);
      } catch {
        if (!active) return;
        setHoverPath([]);
      }
    }
    loadPath(hoverHex);
    return () => {
      active = false;
    };
  }, [hoverHex, epochSeconds]);

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
  const toHeading = (p: Aircraft) =>
    typeof p.track === "number"
      ? p.track
      : typeof p.true_heading === "number"
      ? p.true_heading
      : typeof p.nav_heading === "number"
      ? p.nav_heading
      : 0;
  const projectEndpoint = (lat: number, lon: number, bearingDeg: number, distanceM: number) => {
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

  // Debounce slider to update the map only every 50ms
  useEffect(() => {
    const id = setTimeout(() => setEpochSeconds(sliderValue), 50);
    return () => clearTimeout(id);
  }, [sliderValue]);

  useEffect(() => {
    fetchPlanes(epochSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epochSeconds]);

  const handleAddMarker = (latlng: L.LatLng) => {
    setMarkers((prev) => [...prev, [latlng.lat, latlng.lng]]);
  };

  const RADIUS_2MI_M = 2 * 1609.34;

  const isGround = (p: Aircraft) => p.alt_baro === "ground";
  const distanceFromCenterM = (p: Aircraft) =>
    L.latLng(p.lat as number, p.lon as number).distanceTo(L.latLng(NEWARK_CENTER[0], NEWARK_CENTER[1]));
  const groundInside = planes.filter((p) => isGround(p) && distanceFromCenterM(p) <= RADIUS_2MI_M);
  const groundOutside = planes.filter((p) => isGround(p) && distanceFromCenterM(p) > RADIUS_2MI_M);
  const planesAll = showOutsideGround ? planes : planes.filter((p) => !(isGround(p) && distanceFromCenterM(p) > RADIUS_2MI_M));

  return (
    <>
    <div className="w-full h-[80vh] rounded-lg overflow-hidden border border-foreground/20 relative">
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [20, 20] }}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* blank map: use a minimal neutral tile; you can switch to a solid layer or custom tiles later */}
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Newark borders: 20 nm circle */}
        {showNewarkBorders ? (
          <Circle center={NEWARK_CENTER as unknown as L.LatLngExpression} radius={NEWARK_RADIUS_M} pathOptions={{ color: "#ef4444", weight: 2, fillOpacity: 0.08 }} />
        ) : null}

        {/* Newark ground traffic radius: 2 miles (yellow) */}
        {showNewarkGround ? (
          <Circle center={NEWARK_CENTER as unknown as L.LatLngExpression} radius={RADIUS_2MI_M} pathOptions={{ color: "#ef4444", weight: 2, dashArray: "4 4", fillOpacity: 0.04 }} />
        ) : null}

        {overlayImageUrl ? (
          <ImageOverlay url={overlayImageUrl} bounds={bounds} />
        ) : null}

        {markers.map((pos, idx) => (
          <Marker key={idx} position={pos} />
        ))}

        {/* Plane markers at selected timestamp (all) */}
        {planesAll.map((p) => {
          const heading =
            typeof p.track === "number"
              ? p.track
              : typeof p.true_heading === "number"
              ? p.true_heading
              : typeof p.nav_heading === "number"
              ? p.nav_heading
              : 0;
          const rotation = heading - 90; // Lucide SendHorizontal points right; rotate left 90° so 0° points up
          const svg = renderToStaticMarkup(
            <FaPlane size={18} color="#1d4ed8" />
          );
          const icon = L.divIcon({
            className: "plane-icon",
            html: `
              <div style="
                transform: rotate(${rotation}deg);
                width: 18px;
                height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                text-shadow: 0 0 1px #fff;
              ">
                ${svg}
              </div>
            `,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });
          const lat = p.lat as number;
          const lon = p.lon as number;
          const gs = typeof p.gs === "number" ? p.gs : undefined;
          const alt = typeof p.alt_baro === "number" ? p.alt_baro : undefined;
          const bearing = heading;
          // velocity vector length: scale with speed (knots) but clamp for visibility
          const vectorMeters = gs ? clamp(gs * 1.5, 150, 800) : 300;
          const endpoint = projectEndpoint(lat, lon, bearing, vectorMeters);
          return (
            <Marker
              key={(p.hex ?? `${lat}_${lon}`) + "_all"}
              position={[lat, lon]}
              icon={icon}
              eventHandlers={{
                mouseover: () => setHoverHex((p.hex as string) || null),
                mouseout: () => setHoverHex((prev) => (prev === p.hex ? null : prev)),
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={1} permanent={false}>
                <div className="text-xs leading-tight">
                  <div className="font-medium">{(p.flight ?? p.hex ?? "").trim()}</div>
                  <div className="italic text-blue-600 dark:text-blue-400">
                    🔊 {getPronunciation(p.flight, p.airline)}
                  </div>
                  {p.airline && (
                    <div className="text-[10px] text-gray-600 dark:text-gray-400">
                      {p.airline.name || p.airline.icaoCode}
                    </div>
                  )}
                  <div>{p.t ?? ""}</div>
                  <div>
                    {gs != null ? `${Math.round(gs)} kts` : ""}
                    {alt != null ? ` · ${alt} ft` : ""}
                  </div>
                </div>
              </Tooltip>
              <Polyline
                positions={[[lat, lon] as unknown as L.LatLngExpression, endpoint as unknown as L.LatLngExpression]}
                pathOptions={{ color: "#2563eb", weight: 2, opacity: 0.9 }}
              />
            </Marker>
          );
        })}

        {/* Hover path alternating segments and point markers */}
        {hoverPath.length >= 2
          ? hoverPath.slice(0, hoverPath.length - 1).map((start, idx) => {
              const end = hoverPath[idx + 1];
              const color = idx % 2 === 0 ? "#6b7280" : "#4b5563"; // gray-500, gray-600
              return (
                <Polyline
                  key={`seg_${idx}`}
                  positions={[start as unknown as L.LatLngExpression, end as unknown as L.LatLngExpression]}
                  pathOptions={{ color, weight: 2, opacity: 0.9 }}
                />
              );
            })
          : null}

        {/* Ground inside Newark 2-mi (yellow) */}
        {showNewarkGround
            ? groundInside.map((p) => {
              const heading =
                typeof p.track === "number"
                  ? p.track
                  : typeof p.true_heading === "number"
                  ? p.true_heading
                  : typeof p.nav_heading === "number"
                  ? p.nav_heading
                  : 0;
              const rotation = heading - 90;
              const svg = renderToStaticMarkup(
                <FaPlane size={20} color="#ef4444" />
              );
              const icon = L.divIcon({
                className: "plane-icon",
                html: `
                  <div style="
                    transform: rotate(${rotation}deg);
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-shadow: 0 0 1px #000;
                  ">
                    ${svg}
                  </div>
                `,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              });
              return (
                <Marker key={(p.hex ?? `${p.lat}_${p.lon}`) + "_in"} position={[p.lat as number, p.lon as number]} icon={icon} />
              );
            })
          : null}

        {/* Ground outside Newark 2-mi (red) */}
        {showOutsideGround
          ? groundOutside.map((p) => {
              const heading =
                typeof p.track === "number"
                  ? p.track
                  : typeof p.true_heading === "number"
                  ? p.true_heading
                  : typeof p.nav_heading === "number"
                  ? p.nav_heading
                  : 0;
              const rotation = heading - 90;
              const svg = renderToStaticMarkup(
                <FaPlane size={20} color="#6b7280" />
              );
              const icon = L.divIcon({
                className: "plane-icon",
                html: `
                  <div style="
                    transform: rotate(${rotation}deg);
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-shadow: 0 0 1px #fff;
                  ">
                    ${svg}
                  </div>
                `,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              });
              return (
                <Marker key={(p.hex ?? `${p.lat}_${p.lon}`) + "_out"} position={[p.lat as number, p.lon as number]} icon={icon} />
              );
            })
          : null}

        {/* User-generated markers disabled */}
      </MapContainer>

      {/* Time slider overlay */}
      <div className="absolute left-0 right-0 bottom-2 z-[1000] flex flex-col items-center gap-2 px-4 pointer-events-auto">
        <div className="flex items-center justify-between w-full max-w-3xl text-xs text-foreground/80">
          <span>{new Date(startEpoch * 1000).toISOString().replace(".000Z", "Z")}</span>
          <span className="font-medium">{new Date(sliderValue * 1000).toISOString().replace(".000Z", "Z")}</span>
          <span>{new Date(endEpoch * 1000).toISOString().replace(".000Z", "Z")}</span>
        </div>
        <div className="w-full max-w-3xl bg-background/60 rounded-md backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 border border-foreground/10">
          <Slider
            aria-label="Timestamp"
            minValue={startEpoch}
            maxValue={endEpoch}
            step={2}
            value={sliderValue}
            onChange={(val) => {
              const next = Array.isArray(val) ? val[0] : val;
              if (typeof next === "number") setSliderValue(next);
            }}
          />
        </div>
      </div>
    </div>

    {/* Options below the map */}
    <div className="w-full mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="flex items-center justify-between gap-3 rounded-md border border-foreground/10 px-3 py-2">
        <div className="text-sm">Show Newark borders (20 nm)</div>
        <Switch isSelected={showNewarkBorders} onValueChange={setShowNewarkBorders} aria-label="Show Newark borders" />
      </div>
      <div className="flex items-center justify-between gap-3 rounded-md border border-foreground/10 px-3 py-2">
        <div className="text-sm">Show Newark ground traffic (2 mi)</div>
        <Switch isSelected={showNewarkGround} onValueChange={setShowNewarkGround} aria-label="Show Newark ground traffic" />
      </div>
      <div className="flex items-center justify-between gap-3 rounded-md border border-foreground/10 px-3 py-2">
        <div className="text-sm">Show ground aircraft outside Newark</div>
        <Switch isSelected={showOutsideGround} onValueChange={setShowOutsideGround} aria-label="Show ground aircraft outside Newark" />
      </div>
    </div>
    </>
  );
}


