"use client";

import { Marker, Tooltip, Polyline } from "react-leaflet";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { FaPlane } from "react-icons/fa6";
import type { Aircraft } from "@/types/aircraft";
import { getPronunciation, toHeading, projectEndpoint, clamp } from "@/utils/aircraft-utils";

type AircraftMarkerProps = {
  aircraft: Aircraft;
  iconSize?: number;
  iconColor?: string;
  onHover?: (hex: string | null) => void;
  onHoverOut?: (hex: string | null) => void;
};

export default function AircraftMarker({
  aircraft,
  iconSize = 18,
  iconColor = "#1d4ed8",
  onHover,
  onHoverOut,
}: AircraftMarkerProps) {
  const heading = toHeading(aircraft);
  const rotation = heading - 90; // Rotate so 0° points up
  const svg = renderToStaticMarkup(<FaPlane size={iconSize} color={iconColor} />);
  
  const icon = L.divIcon({
    className: "plane-icon",
    html: `
      <div style="
        transform: rotate(${rotation}deg);
        width: ${iconSize}px;
        height: ${iconSize}px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-shadow: 0 0 1px #fff;
      ">
        ${svg}
      </div>
    `,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2],
  });

  const lat = aircraft.lat as number;
  const lon = aircraft.lon as number;
  const gs = typeof aircraft.gs === "number" ? aircraft.gs : undefined;
  const alt = typeof aircraft.alt_baro === "number" ? aircraft.alt_baro : undefined;
  const bearing = heading;
  
  // velocity vector length: scale with speed (knots) but clamp for visibility
  const vectorMeters = gs ? clamp(gs * 1.5, 150, 800) : 300;
  const endpoint = projectEndpoint(lat, lon, bearing, vectorMeters);

  return (
    <Marker
      key={(aircraft.hex ?? `${lat}_${lon}`)}
      position={[lat, lon]}
      icon={icon}
      eventHandlers={{
        mouseover: () => onHover?.((aircraft.hex as string) || null),
        mouseout: () => onHoverOut?.((aircraft.hex as string) || null),
      }}
    >
      <Tooltip direction="top" offset={[0, -6]} opacity={1} permanent={false}>
        <div className="text-xs leading-tight">
          <div className="font-medium">{(aircraft.flight ?? aircraft.hex ?? "").trim()}</div>
          <div className="italic text-blue-600 dark:text-blue-400">
            🔊 {getPronunciation(aircraft.flight, aircraft.airline)}
          </div>
          {aircraft.airline && (
            <div className="text-[10px] text-gray-600 dark:text-gray-400">
              {aircraft.airline.name || aircraft.airline.icaoCode}
            </div>
          )}
          <div>{aircraft.t ?? ""}</div>
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
}

