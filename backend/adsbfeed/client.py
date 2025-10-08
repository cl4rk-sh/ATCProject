from __future__ import annotations

import os
from typing import Any, Dict, Optional

import httpx


class AdsbLolClient:
    """Minimal client for the adsb.lol API v2.

    Provides convenience methods to query aircraft within a radius of a point.
    Base URL defaults to `https://api.adsb.lol` and can be overridden via the
    `ADSB_LOL_BASE_URL` environment variable or the constructor argument.
    """

    def __init__(
        self,
        base_url: str | None = None,
        *,
        timeout_s: float = 10.0,
        default_headers: Optional[Dict[str, str]] = None,
    ) -> None:
        self.base_url = (
            base_url or os.getenv("ADSB_LOL_BASE_URL") or "https://api.adsb.lol"
        ).rstrip("/")
        self._client = httpx.Client(timeout=timeout_s, headers=default_headers)

    def __enter__(self) -> "AdsbLolClient":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:  # type: ignore[override]
        self.close()

    def close(self) -> None:
        self._client.close()

    def get_aircraft_in_radius(self, lat: float, lon: float, radius_nm: float) -> Dict[str, Any]:
        """Return JSON for all aircraft within radius (nm) of lat/lon.

        Endpoint: /v2/lat/{lat}/lon/{lon}/dist/{radius}
        Radius is in nautical miles. The API maximum is 250 nm.
        """
        if radius_nm <= 0 or radius_nm > 250:
            raise ValueError("radius_nm must be in (0, 250]")
        url = f"{self.base_url}/v2/lat/{lat}/lon/{lon}/dist/{radius_nm}"
        resp = self._client.get(url)
        resp.raise_for_status()
        return resp.json()

    def get_point(self, lat: float, lon: float, radius_nm: float) -> Dict[str, Any]:
        """Same query via /v2/point/{lat}/{lon}/{radius}."""
        if radius_nm <= 0 or radius_nm > 250:
            raise ValueError("radius_nm must be in (0, 250]")
        url = f"{self.base_url}/v2/point/{lat}/{lon}/{radius_nm}"
        resp = self._client.get(url)
        resp.raise_for_status()
        return resp.json()

    def get_by_callsign(self, callsign: str) -> Dict[str, Any]:
        """Get aircraft by callsign using the /v2/callsign endpoint."""
        url = f"{self.base_url}/v2/callsign/{callsign}"
        resp = self._client.get(url)
        resp.raise_for_status()
        return resp.json()
