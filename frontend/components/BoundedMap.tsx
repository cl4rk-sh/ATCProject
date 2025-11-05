"use client";

import { useCallback, useMemo, useState } from "react";
import Map, { MapRef, Marker, Source, Layer, ViewStateChangeEvent } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent, LngLatBoundsLike, LngLatLike } from "maplibre-gl";

type BoundedMapProps = {
  overlayImageUrl?: string;
  initialMarkers?: [number, number][]; // [lng, lat]
};

// Bounds per user request (lng, lat): [-74.75, 40.25] to [-73.25, 41.25]
const MIN_LNG = -74.75;
const MAX_LNG = -73.25;
const MIN_LAT = 40.25;
const MAX_LAT = 41.25;
const MAX_BOUNDS: LngLatBoundsLike = [MIN_LNG, MIN_LAT, MAX_LNG, MAX_LAT];

const INITIAL_VIEW = {
  longitude: (MIN_LNG + MAX_LNG) / 2,
  latitude: (MIN_LAT + MAX_LAT) / 2,
  zoom: 9,
};

export default function BoundedMap({ overlayImageUrl, initialMarkers = [] }: BoundedMapProps) {
  const [markers, setMarkers] = useState<[number, number][]>(initialMarkers);

  const style = useMemo(
    () => ({
      version: 8,
      // A minimal light vector style; can be replaced with your own or an empty style with background only
      sources: {},
      layers: [
        { id: "background", type: "background", paint: { "background-color": "#e8eaef" } },
      ],
    }),
    []
  );

  const onClick = useCallback((e: MapLayerMouseEvent) => {
    const { lng, lat } = e.lngLat;
    if (lng < MIN_LNG || lng > MAX_LNG || lat < MIN_LAT || lat > MAX_LAT) return;
    setMarkers((prev) => [...prev, [lng, lat]]);
  }, []);

  const onMarkerDragEnd = useCallback((idx: number, e: any) => {
    const { lng, lat } = e.lngLat as { lng: number; lat: number };
    const clampedLng = Math.min(Math.max(lng, MIN_LNG), MAX_LNG);
    const clampedLat = Math.min(Math.max(lat, MIN_LAT), MAX_LAT);
    setMarkers((prev) => {
      const next = [...prev];
      next[idx] = [clampedLng, clampedLat];
      return next;
    });
  }, []);

  return (
    <div className="w-full h-[80vh] rounded-lg overflow-hidden border border-foreground/20">
      <Map
        initialViewState={INITIAL_VIEW}
        minZoom={7}
        maxZoom={18}
        maxBounds={MAX_BOUNDS}
        style={{ width: "100%", height: "100%" }}
        mapStyle={style as any}
        interactiveLayerIds={[]}
        onClick={onClick}
        dragRotate={false}
        touchZoomRotate={true}
        attributionControl={false}
      >
        {overlayImageUrl ? (
          <Source
            id="overlay-image"
            type="image"
            url={overlayImageUrl}
            coordinates={[
              [MIN_LNG, MAX_LAT], // top-left
              [MAX_LNG, MAX_LAT], // top-right
              [MAX_LNG, MIN_LAT], // bottom-right
              [MIN_LNG, MIN_LAT], // bottom-left
            ]}
          >
            <Layer id="overlay-image-layer" type="raster" />
          </Source>
        ) : null}

        {markers.map(([lng, lat], idx) => (
          <Marker
            key={idx}
            longitude={lng}
            latitude={lat}
            draggable
            onDragEnd={(e) => onMarkerDragEnd(idx, e)}
          />
        ))}
      </Map>
    </div>
  );
}


