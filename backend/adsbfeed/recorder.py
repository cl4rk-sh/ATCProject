from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import Tuple

from .client import AdsbLolClient


def parse_center(env_val: str | None, default: Tuple[float, float]) -> Tuple[float, float]:
    if not env_val:
        return default
    lat_str, lon_str = env_val.split(",", 1)
    return float(lat_str.strip()), float(lon_str.strip())


def parse_iso8601_utc(value: str) -> datetime:
    s = value.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def sleep_until(target_utc: datetime) -> None:
    while True:
        now = datetime.now(timezone.utc)
        remaining = (target_utc - now).total_seconds()
        if remaining <= 0:
            break
        time.sleep(min(remaining, 0.5))


def main() -> None:
    parser = argparse.ArgumentParser(add_help=True)
    parser.add_argument("--start-utc", required=True, help="UTC start time ISO8601, e.g. 2025-10-03T12:34:56Z")
    parser.add_argument("--outdir", default="adsb data", help="Output directory (default: 'adsb data')")
    parser.add_argument("--lat", type=float, help="Center latitude. Overrides KEWR_CENTER env")
    parser.add_argument("--lon", type=float, help="Center longitude. Overrides KEWR_CENTER env")
    parser.add_argument("--radius", type=float, help="Radius nm. Overrides RADIUS_NM env (default 20)")
    parser.add_argument("--interval", type=float, default=2.0, help="Sampling interval seconds (default 2)")
    parser.add_argument(
        "--duration", type=float, default=30 * 60.0, help="Total duration seconds (default 1800 = 30 minutes)"
    )
    parser.add_argument("--use-point-endpoint", action="store_true", help="Use /v2/point endpoint")
    args = parser.parse_args()

    start_utc = parse_iso8601_utc(args.start_utc)
    if args.interval <= 0:
        raise SystemExit(2)
    if args.duration <= 0:
        raise SystemExit(2)

    default_center = (40.6895, -74.1745)
    env_center = os.getenv("KEWR_CENTER")
    lat_env, lon_env = parse_center(env_center, default_center)
    lat = args.lat if args.lat is not None else lat_env
    lon = args.lon if args.lon is not None else lon_env
    radius_nm = float(os.getenv("RADIUS_NM", "20")) if args.radius is None else float(args.radius)

    outdir = os.path.abspath(args.outdir)
    os.makedirs(outdir, exist_ok=True)

    # Wait until the requested UTC time
    sleep_until(start_utc)

    # Schedule sampling
    end_utc = start_utc + timedelta(seconds=args.duration)
    next_tick = start_utc

    with AdsbLolClient() as client:
        while True:
            now = datetime.now(timezone.utc)
            if now >= end_utc:
                break

            # Fetch snapshot
            if args.use_point_endpoint:
                data = client.get_point(lat, lon, radius_nm)
            else:
                data = client.get_aircraft_in_radius(lat, lon, radius_nm)

            # Augment with metadata
            data["_meta"] = {
                "captured_at": now.isoformat(),
                "center": {"lat": lat, "lon": lon},
                "radius_nm": radius_nm,
                "endpoint": "point" if args.use_point_endpoint else "latlon",
            }

            # Save file
            ts = now.strftime("%Y%m%dT%H%M%SZ")
            filename = f"adsb_{ts}.json"
            path = os.path.join(outdir, filename)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

            # Compute next tick and sleep
            next_tick = next_tick + timedelta(seconds=args.interval)
            sleep_until(next_tick)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001 - terminal-only error reporting required
        print(f"error: {exc}", file=sys.stderr)
        sys.exit(1)



