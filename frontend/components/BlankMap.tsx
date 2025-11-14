"use client";

import { useEffect, useMemo, useState } from "react";
import L, { LatLngExpression, LatLngBoundsExpression } from "leaflet";
import type { Aircraft } from "@/types/aircraft";
import { USER_BOUNDS, NEWARK_CENTER, RADIUS_2MI_M } from "@/utils/aircraft-constants";
import { filterPlanes } from "@/utils/aircraft-utils";
import AircraftSearchSidebar from "./AircraftSearchSidebar";
import AircraftMap from "./AircraftMap";
import TimeSlider from "./TimeSlider";
import MapControls from "./MapControls";

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

export default function BlankMap({ overlayImageUrl, initialMarkers = [] }: BlankMapProps) {
  const [markers, setMarkers] = useState<LatLngExpression[]>(initialMarkers);
  const bounds = useMemo<LatLngBoundsExpression>(() => USER_BOUNDS, []);
  const [planes, setPlanes] = useState<Aircraft[]>([]);
  const [currentSnapshotId, setCurrentSnapshotId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showNewarkBorders, setShowNewarkBorders] = useState<boolean>(true);
  const [showNewarkGround, setShowNewarkGround] = useState<boolean>(false);
  const [showOutsideGround, setShowOutsideGround] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<{ aircraft: Aircraft[]; additional: Aircraft[] }>({ aircraft: [], additional: [] });

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
      if (json?.snapshot?.id) {
        setCurrentSnapshotId(json.snapshot.id);
      }
    } catch (err) {
      setPlanes([]);
    } finally {
      setLoading(false);
    }
  };

  // Search all aircraft when query changes (debounced)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ aircraft: [], additional: [] });
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: searchQuery.trim(),
          ...(currentSnapshotId ? { currentSnapshotId: String(currentSnapshotId) } : {}),
        });
        const res = await fetch(`/api/aircraft/search?${params.toString()}`);
        const json = await res.json();
        setSearchResults({
          aircraft: json.aircraft || [],
          additional: json.additional || [],
        });
      } catch (err) {
        setSearchResults({ aircraft: [], additional: [] });
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentSnapshotId]);

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

  const isGround = (p: Aircraft) => p.alt_baro === "ground";
  const distanceFromCenterM = (p: Aircraft) =>
    L.latLng(p.lat as number, p.lon as number).distanceTo(L.latLng(NEWARK_CENTER[0], NEWARK_CENTER[1]));
  const groundInside = planes.filter((p) => isGround(p) && distanceFromCenterM(p) <= RADIUS_2MI_M);
  const groundOutside = planes.filter((p) => isGround(p) && distanceFromCenterM(p) > RADIUS_2MI_M);
  const planesAll = showOutsideGround ? planes : planes.filter((p) => !(isGround(p) && distanceFromCenterM(p) > RADIUS_2MI_M));

  // Filter planes based on search query
  const filteredPlanesAll = filterPlanes(planesAll, searchQuery);
  const filteredGroundInside = filterPlanes(groundInside, searchQuery);
  const filteredGroundOutside = filterPlanes(groundOutside, searchQuery);

  return (
    <div className="w-full h-full flex gap-4 p-4">
      {/* Left Column: Search */}
      <AircraftSearchSidebar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currentAircraft={filteredPlanesAll}
        searchResults={searchResults}
        onAircraftHover={setHoverHex}
      />

      {/* Middle Column: Map, Slider, and Controls */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Row 1: Map */}
        <div className="flex-1 min-h-0">
          <AircraftMap
            bounds={bounds}
            overlayImageUrl={overlayImageUrl}
            markers={markers}
            filteredPlanesAll={filteredPlanesAll}
            filteredGroundInside={filteredGroundInside}
            filteredGroundOutside={filteredGroundOutside}
            hoverPath={hoverPath}
            showNewarkBorders={showNewarkBorders}
            showNewarkGround={showNewarkGround}
            showOutsideGround={showOutsideGround}
            onAircraftHover={setHoverHex}
            onAircraftHoverOut={(hex) => setHoverHex(null)}
          />
        </div>

        {/* Row 2: Time slider */}
        <div className="flex-shrink-0">
          <TimeSlider
            startEpoch={startEpoch}
            endEpoch={endEpoch}
            value={sliderValue}
            onChange={setSliderValue}
          />
        </div>

        {/* Row 3: Options switches */}
        <div className="flex-shrink-0">
          <MapControls
            showNewarkBorders={showNewarkBorders}
            onNewarkBordersChange={setShowNewarkBorders}
            showNewarkGround={showNewarkGround}
            onNewarkGroundChange={setShowNewarkGround}
            showOutsideGround={showOutsideGround}
            onOutsideGroundChange={setShowOutsideGround}
          />
        </div>
      </div>

      {/* Right Column: Placeholder */}
      <div className="w-64 flex-shrink-0 border-l border-foreground/10 p-4">
        <div className="text-sm text-foreground/60">Right column - TBD</div>
      </div>
    </div>
  );
}
