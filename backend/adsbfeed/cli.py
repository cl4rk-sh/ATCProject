from __future__ import annotations

import argparse
import json
import os
from typing import Tuple

from .client import AdsbLolClient


def parse_center(env_val: str | None, default: Tuple[float, float]) -> Tuple[float, float]:
    if not env_val:
        return default
    try:
        lat_str, lon_str = env_val.split(",", 1)
        return float(lat_str.strip()), float(lon_str.strip())
    except Exception as exc:  # noqa: BLE001 - simple CLI parsing
        raise ValueError("KEWR_CENTER must be 'lat,lon'") from exc


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch aircraft within radius of a point using adsb.lol")
    parser.add_argument("--lat", type=float, help="Center latitude. Overrides KEWR_CENTER env")
    parser.add_argument("--lon", type=float, help="Center longitude. Overrides KEWR_CENTER env")
    parser.add_argument("--radius", type=float, default=None, help="Radius nm. Overrides RADIUS_NM env (default 20)")
    parser.add_argument("--point-endpoint", action="store_true", help="Use /v2/point/{lat}/{lon}/{radius}")
    args = parser.parse_args()

    default_center = (40.6895, -74.1745)
    env_center = os.getenv("KEWR_CENTER")
    lat_env, lon_env = parse_center(env_center, default_center)
    lat = args.lat if args.lat is not None else lat_env
    lon = args.lon if args.lon is not None else lon_env

    try:
        radius_nm = (
            float(os.getenv("RADIUS_NM", "20")) if args.radius is None else float(args.radius)
        )
    except ValueError as exc:  # noqa: BLE001
        raise ValueError("RADIUS_NM must be numeric") from exc

    with AdsbLolClient() as client:
        data = (
            client.get_point(lat, lon, radius_nm)
            if args.point_endpoint
            else client.get_aircraft_in_radius(lat, lon, radius_nm)
        )

    print(json.dumps(data, indent=2, sort_keys=False))


if __name__ == "__main__":
    main()


