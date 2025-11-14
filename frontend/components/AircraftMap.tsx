"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  ImageOverlay,
  Circle,
  Polyline,
  Tooltip,
} from "react-leaflet";
import L, { LatLngExpression, LatLngBoundsExpression } from "leaflet";
import type { Aircraft } from "@/types/aircraft";
import { renderToStaticMarkup } from "react-dom/server";
import { FaPlane } from "react-icons/fa6";
import AircraftMarker from "./AircraftMarker";
import {
  USER_BOUNDS,
  NEWARK_CENTER,
  NEWARK_RADIUS_M,
  RADIUS_2MI_M,
} from "@/utils/aircraft-constants";

type AircraftMapProps = {
  bounds: LatLngBoundsExpression;
  overlayImageUrl?: string;
  markers: LatLngExpression[];
  filteredPlanesAll: Aircraft[];
  filteredGroundInside: Aircraft[];
  filteredGroundOutside: Aircraft[];
  hoverPath: Array<[number, number]>;
  showNewarkBorders: boolean;
  showNewarkGround: boolean;
  showOutsideGround: boolean;
  onAircraftHover: (hex: string | null) => void;
  onAircraftHoverOut: (hex: string | null) => void;
};

export default function AircraftMap({
  bounds,
  overlayImageUrl,
  markers,
  filteredPlanesAll,
  filteredGroundInside,
  filteredGroundOutside,
  hoverPath,
  showNewarkBorders,
  showNewarkGround,
  showOutsideGround,
  onAircraftHover,
  onAircraftHoverOut,
}: AircraftMapProps) {
  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-foreground/20">
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [20, 20] }}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Newark borders: 20 nm circle */}
        {showNewarkBorders && (
          <Circle
            center={NEWARK_CENTER as unknown as L.LatLngExpression}
            radius={NEWARK_RADIUS_M}
            pathOptions={{ color: "#ef4444", weight: 2, fillOpacity: 0.08 }}
          />
        )}

        {/* Newark ground traffic radius: 2 miles */}
        {showNewarkGround && (
          <Circle
            center={NEWARK_CENTER as unknown as L.LatLngExpression}
            radius={RADIUS_2MI_M}
            pathOptions={{ color: "#ef4444", weight: 2, dashArray: "4 4", fillOpacity: 0.04 }}
          />
        )}

        {overlayImageUrl && <ImageOverlay url={overlayImageUrl} bounds={bounds} />}

        {markers.map((pos, idx) => (
          <Marker key={idx} position={pos} />
        ))}

        {/* Plane markers at selected timestamp (filtered) */}
        {filteredPlanesAll.map((p) => (
          <AircraftMarker
            key={(p.hex ?? `${p.lat}_${p.lon}`) + "_all"}
            aircraft={p}
            iconSize={18}
            iconColor="#1d4ed8"
            onHover={onAircraftHover}
            onHoverOut={onAircraftHoverOut}
          />
        ))}

        {/* Hover path alternating segments */}
        {hoverPath.length >= 2 &&
          hoverPath.slice(0, hoverPath.length - 1).map((start, idx) => {
            const end = hoverPath[idx + 1];
            const color = idx % 2 === 0 ? "#6b7280" : "#4b5563"; // gray-500, gray-600
            return (
              <Polyline
                key={`seg_${idx}`}
                positions={[start as unknown as L.LatLngExpression, end as unknown as L.LatLngExpression]}
                pathOptions={{ color, weight: 2, opacity: 0.9 }}
              />
            );
          })}

        {/* Ground inside Newark 2-mi */}
        {showNewarkGround &&
          filteredGroundInside.map((p) => {
            const heading =
              typeof p.track === "number"
                ? p.track
                : typeof p.true_heading === "number"
                ? p.true_heading
                : typeof p.nav_heading === "number"
                ? p.nav_heading
                : 0;
            const rotation = heading - 90;
            const svg = renderToStaticMarkup(<FaPlane size={20} color="#ef4444" />);
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
              <Marker
                key={(p.hex ?? `${p.lat}_${p.lon}`) + "_in"}
                position={[p.lat as number, p.lon as number]}
                icon={icon}
              />
            );
          })}

        {/* Ground outside Newark 2-mi */}
        {showOutsideGround &&
          filteredGroundOutside.map((p) => {
            const heading =
              typeof p.track === "number"
                ? p.track
                : typeof p.true_heading === "number"
                ? p.true_heading
                : typeof p.nav_heading === "number"
                ? p.nav_heading
                : 0;
            const rotation = heading - 90;
            const svg = renderToStaticMarkup(<FaPlane size={20} color="#6b7280" />);
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
              <Marker
                key={(p.hex ?? `${p.lat}_${p.lon}`) + "_out"}
                position={[p.lat as number, p.lon as number]}
                icon={icon}
              />
            );
          })}
      </MapContainer>
    </div>
  );
}

