from datetime import datetime, timedelta, timezone
import json
import os
import re
import subprocess
from typing import Any, Dict, List, Optional, Tuple

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ADSB_DIR = os.path.join(BASE_DIR, "adsb_data")
AUDIO_DIR = os.path.join(BASE_DIR, "toweraudio")


app = FastAPI(title="ATC Context API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


ADS_B_FILENAME_RE = re.compile(r"adsb_(\d{8}T\d{6})Z\.json$")


def parse_timestamp(param: str) -> datetime:
    """Parse timestamp input supporting ISO8601, seconds, or milliseconds since epoch.

    Returns timezone-aware UTC datetime.
    """
    # Try integer ms or s since epoch
    try:
        as_int = int(param)
        # Heuristic: treat >= 10^12 as ms
        if as_int > 10 ** 12:
            return datetime.fromtimestamp(as_int / 1000.0, tz=timezone.utc)
        return datetime.fromtimestamp(as_int, tz=timezone.utc)
    except ValueError:
        pass

    # Try ISO8601
    try:
        # Normalize Z
        if param.endswith("Z"):
            iso_val = param[:-1] + "+00:00"
        else:
            iso_val = param
        dt = datetime.fromisoformat(iso_val)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
        return dt
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Invalid timestamp format: {param}") from exc


def parse_adsb_filename_to_dt(filename: str) -> Optional[datetime]:
    match = ADS_B_FILENAME_RE.search(filename)
    if not match:
        return None
    ts_str = match.group(1)  # YYYYMMDDThhmmss
    try:
        return datetime.strptime(ts_str, "%Y%m%dT%H%M%S").replace(tzinfo=timezone.utc)
    except Exception:
        return None


def list_adsb_files_sorted() -> List[str]:
    if not os.path.isdir(ADSB_DIR):
        return []
    all_files = [
        os.path.join(ADSB_DIR, name)
        for name in os.listdir(ADSB_DIR)
        if name.endswith(".json")
    ]
    files_with_dt: List[Tuple[datetime, str]] = []
    for path in all_files:
        dt = parse_adsb_filename_to_dt(os.path.basename(path))
        if dt is not None:
            files_with_dt.append((dt, path))
    files_with_dt.sort(key=lambda x: x[0])
    return [p for _, p in files_with_dt]


def find_adsb_files_in_range(center: datetime, past_seconds: float, future_seconds: float) -> List[str]:
    start = center - timedelta(seconds=past_seconds)
    end = center + timedelta(seconds=future_seconds)
    result: List[str] = []
    for path in list_adsb_files_sorted():
        dt = parse_adsb_filename_to_dt(os.path.basename(path))
        if dt is None:
            continue
        if start <= dt <= end:
            result.append(path)
    return result


def find_closest_adsb_file(center: datetime) -> Optional[str]:
    closest: Tuple[float, Optional[str]] = (float("inf"), None)
    for path in list_adsb_files_sorted():
        dt = parse_adsb_filename_to_dt(os.path.basename(path))
        if dt is None:
            continue
        delta = abs((dt - center).total_seconds())
        if delta < closest[0]:
            closest = (delta, path)
    return closest[1]


MONTHS = {
    "Jan": 1,
    "Feb": 2,
    "Mar": 3,
    "Apr": 4,
    "May": 5,
    "Jun": 6,
    "Jul": 7,
    "Aug": 8,
    "Sep": 9,
    "Oct": 10,
    "Nov": 11,
    "Dec": 12,
}


def parse_audio_filename_to_dt(filename: str) -> Optional[datetime]:
    # Example: KEWR-Twr-Oct-08-2025-1730Z.mp3
    name = os.path.splitext(os.path.basename(filename))[0]
    parts = name.split("-")
    # Expect something like ["KEWR", "Twr", "Oct", "08", "2025", "1730Z"]
    if len(parts) < 6:
        return None
    try:
        month_str = parts[-4]
        day_str = parts[-3]
        year_str = parts[-2]
        hmz = parts[-1]
        if not hmz.endswith("Z"):
            return None
        hm = hmz[:-1]
        if len(hm) != 4:
            return None
        hour = int(hm[:2])
        minute = int(hm[2:])
        month = MONTHS.get(month_str)
        if month is None:
            return None
        day = int(day_str)
        year = int(year_str)
        return datetime(year, month, day, hour, minute, tzinfo=timezone.utc)
    except Exception:
        return None


def list_audio_files() -> List[str]:
    if not os.path.isdir(AUDIO_DIR):
        return []
    return [os.path.join(AUDIO_DIR, f) for f in os.listdir(AUDIO_DIR) if f.lower().endswith(".mp3")]


def find_audio_file_for_timestamp(ts: datetime) -> Optional[Tuple[str, datetime]]:
    """Return (filepath, start_dt) for the file whose start datetime is the latest not after ts.

    If none qualifies, return the earliest we can parse.
    Prioritizes KEWRtwraudio_cut.mp3 if it exists.
    """
    # Check for the cut file first (starts at 17:38:19 UTC = 17:30 + 08:19 offset)
    cut_file_path = os.path.join(AUDIO_DIR, "KEWRtwraudio_cut.mp3")
    if os.path.isfile(cut_file_path):
        # The cut file starts at 08:19 into the original file (17:30 UTC)
        # So its effective start time is 2025-10-08 17:38:19 UTC
        cut_start_dt = datetime(2025, 10, 8, 17, 38, 19, tzinfo=timezone.utc)
        if cut_start_dt <= ts:
            return (cut_file_path, cut_start_dt)
    
    candidates: List[Tuple[datetime, str]] = []
    for path in list_audio_files():
        # Skip the cut file as we've already handled it
        if os.path.basename(path) == "KEWRtwraudio_cut.mp3":
            continue
        dt = parse_audio_filename_to_dt(path)
        if dt is not None:
            candidates.append((dt, path))
    if not candidates:
        return None
    candidates.sort(key=lambda x: x[0])
    best: Optional[Tuple[datetime, str]] = None
    for start_dt, path in candidates:
        if start_dt <= ts:
            best = (start_dt, path)
        else:
            break
    if best is not None:
        return (best[1], best[0])
    # fallback to earliest
    start_dt, path = candidates[0]
    return (path, start_dt)


def run_ffmpeg_segment(path: str, start_seconds: float, duration_seconds: float) -> StreamingResponse:
    if start_seconds < 0:
        start_seconds = 0
    cmd = [
        "ffmpeg",
        "-ss",
        str(start_seconds),
        "-i",
        path,
        "-t",
        str(duration_seconds),
        "-vn",
        "-acodec",
        "libmp3lame",
        "-f",
        "mp3",
        "-",
    ]
    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=501, detail="ffmpeg is not installed on the server") from exc

    def iter_chunks():
        assert proc.stdout is not None
        for chunk in iter(lambda: proc.stdout.read(8192), b""):
            yield chunk
        proc.stdout.close()
        proc.wait()

    return StreamingResponse(iter_chunks(), media_type="audio/mpeg")


@app.get("/context")
def get_context(
    timestamp: str = Query(..., description="Timestamp (ISO8601, seconds or milliseconds since epoch)"),
    adsb_past_s: float = Query(20.0, ge=0.0, description="ADS-B history seconds (past)"),
    adsb_future_s: float = Query(20.0, ge=0.0, description="ADS-B extension seconds (future)"),
    audio_past_s: float = Query(20.0, ge=0.1, description="Tower audio seconds before timestamp"),
    audio_future_s: float = Query(20.0, ge=0.1, description="Tower audio seconds after timestamp"),
) -> JSONResponse:
    """Return ADS-B current and +/-20s window data and URLs to audio segments.

    The response contains:
    - adsb_current: the closest ADS-B snapshot to the timestamp
    - adsb_window: list of snapshots within +/-20 seconds of the timestamp
    - audio.prev_url: URL to stream the prior 20s audio segment (ts-20s to ts)
    - audio.next_url: URL to stream the next 20s audio segment (ts to ts+20s)
    """
    ts = parse_timestamp(timestamp)

    # ADS-B current
    current_file = find_closest_adsb_file(ts)
    adsb_current: Optional[Dict[str, Any]] = None
    if current_file and os.path.isfile(current_file):
        try:
            with open(current_file, "r", encoding="utf-8") as f:
                adsb_current = json.load(f)
        except Exception:
            adsb_current = None

    # ADS-B window (customizable past/future)
    window_files = find_adsb_files_in_range(ts, past_seconds=adsb_past_s, future_seconds=adsb_future_s)
    adsb_window: List[Dict[str, Any]] = []
    for path in window_files:
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                adsb_window.append(data)
        except Exception:
            continue

    # Audio URLs (computed client-side via separate endpoint)
    # Keep the provided timestamp verbatim to avoid drift
    prev_url = f"/audio/segment?timestamp={timestamp}&relation=prev&past_s={audio_past_s}"
    next_url = f"/audio/segment?timestamp={timestamp}&relation=next&future_s={audio_future_s}"

    payload = {
        "adsb_current": adsb_current,
        "adsb_window": adsb_window,
        "audio": {
            "prev_url": prev_url,
            "next_url": next_url,
        },
    }
    return JSONResponse(content=payload)


@app.get("/audio/segment")
def audio_segment(
    timestamp: str = Query(..., description="Timestamp (ISO8601, seconds or milliseconds since epoch)"),
    relation: str = Query("prev", pattern="^(prev|next)$", description="Segment relation to timestamp"),
    duration: Optional[float] = Query(None, ge=0.1, le=600.0, description="Deprecated: use past_s/future_s"),
    past_s: Optional[float] = Query(None, ge=0.1, le=600.0, description="Seconds before timestamp for prev relation"),
    future_s: Optional[float] = Query(None, ge=0.1, le=600.0, description="Seconds after timestamp for next relation"),
):
    ts = parse_timestamp(timestamp)
    audio_info = find_audio_file_for_timestamp(ts)
    if audio_info is None:
        raise HTTPException(status_code=404, detail="No audio file available")
    path, start_dt = audio_info
    offset = (ts - start_dt).total_seconds()
    # Determine segment length
    if relation == "prev":
        seg_len = past_s if past_s is not None else (duration if duration is not None else 20.0)
        start_sec = max(offset - seg_len, 0.0)
    else:
        seg_len = future_s if future_s is not None else (duration if duration is not None else 20.0)
        start_sec = max(offset, 0.0)
    return run_ffmpeg_segment(path, start_sec, seg_len)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


