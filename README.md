## AI-Enhanced ATC Transcriber & Early Conflict Detection System (KEWR Prototype)

### Overview
Air traffic controller workload and communication errors can lead to late or missed conflict detection. This project prototypes an AI-driven, intention-aware collision avoidance assistant that transcribes live ATC audio, extracts pilot and controller intentions in real time, and fuses them with ADS-B aircraft data to predict conflicts earlier than geometry-only systems.

This is an academic prototype focused on Newark Liberty International Airport (KEWR). Success criterion: <5% error rate in intention mapping versus manual transcription.

> Research/education use only. Not certified for operational ATC or flight use.

### Key Objectives
- **Real-time transcription and diarization** of KEWR tower audio.
- **Intention extraction** (e.g., line up and wait, cleared to land, go around).
- **ADS-B fusion** to align intentions with live aircraft states.
- **Trajectory prediction** based on current kinematics and stated intentions.
- **Conflict detection** with severity, confidence, and time-to-conflict.
- **Web UI** for real-time monitoring and alerting.

---

## Architecture

### System Components
- **Audio Ingestion Service (LiveATC)**: Connects to KEWR tower stream and segments audio.
- **Transcription & NLP Service (Vertex AI Gemini 2.5 Flash)**: Streaming transcription, diarization, and intention extraction.
- **ADS-B Ingestion Service (adsb.lol)**: Pulls/pushes real-time aircraft states near KEWR.
- **Intention–State Correlator**: Maps intentions to callsigns, resolves ambiguity.
- **Trajectory Predictor**: Predicts short-horizon paths conditioned on intentions.
- **Conflict Detection Engine**: Computes separation breaches and runway incursions; assigns severity and confidence.
- **Backend API (FastAPI)**: REST + WebSocket for real-time data; containerized and deployed on Render.
- **Frontend (Next.js + Tailwind + HeroUI)**: Realtime dashboard on Vercel.
- **Cloudflare Worker (TypeScript)**: Keep-alive pings to prevent Render free-tier sleep.

### Technology Stack
- **Backend**: Python 3.11+, FastAPI, Uvicorn, Pydantic, httpx/aiohttp, NumPy/SciPy.
- **AI**: Google Vertex AI Gemini 2.5 Flash for streaming ASR, diarization, and NER/intention extraction.
- **ADS-B**: `adsb.lol` REST/WS API.
- **Frontend**: Next.js (App Router), TypeScript, TailwindCSS, HeroUI.
- **Infra**: Docker, Render (backend), Vercel (frontend), Cloudflare Workers (keep-alive), Cursor IDE (dev).

### Data Flow (High-Level)
```
LiveATC(KEWR) -> Audio Ingestion -> Vertex AI (ASR + diarization + intentions)
                                         |           \
                                         v            \
                                 Intention Events      \
adsb.lol -> ADS-B Ingestion -> Aircraft States --------> Correlator -> Trajectory Predictor -> Conflict Detection
                                                                                                         |
                                                                                                     Alerts
                                                                                                         |
                                                                                          FastAPI (REST/WS) -> Frontend (Vercel)
```

---

## Data Contracts

### Transcription Event
```json
{
  "id": "evt_20251003_000123",
  "timestamp": "2025-10-03T12:34:56.789Z",
  "source": "LiveATC",
  "stream": "KEWR_TWR",
  "speaker": "TOWER",
  "callsign": "UAL123",
  "text": "United one two three, line up and wait runway four left",
  "confidence": 0.94,
  "segments": [
    { "start_s": 0.0, "end_s": 2.3, "text": "United one two three" }
  ],
  "intentions": [
    {
      "type": "LINE_UP_AND_WAIT",
      "runway": "04L",
      "heading_deg": null,
      "altitude_ft": null,
      "speed_kts": null,
      "constraints": [],
      "confidence": 0.88
    }
  ]
}
```

### Aircraft State (ADS-B)
```json
{
  "hex": "a1b2c3",
  "callsign": "UAL123",
  "lat": 40.6895,
  "lon": -74.1745,
  "alt_baro_ft": 1200,
  "ground_speed_kts": 155,
  "track_deg": 040,
  "vert_rate_fpm": -300,
  "timestamp": "2025-10-03T12:34:57Z"
}
```

### Trajectory Prediction
```json
{
  "callsign": "UAL123",
  "horizon_s": 120,
  "samples": [
    { "t": 0, "lat": 40.6895, "lon": -74.1745, "alt_ft": 1200 },
    { "t": 15, "lat": 40.6901, "lon": -74.1732, "alt_ft": 1180 }
  ]
}
```

### Conflict Alert
```json
{
  "id": "conf_000045",
  "aircraft": ["UAL123", "DAL456"],
  "severity": "HIGH",
  "time_to_conflict_s": 45,
  "min_separation": { "horizontal_nm": 1.2, "vertical_ft": 200 },
  "confidence": 0.78,
  "reason": "Projected runway incursion at 04L/22R crossing",
  "created_at": "2025-10-03T12:35:10Z",
  "status": "ACTIVE"
}
```

---

## API Specification (Prototype)

### REST (FastAPI)
- **GET** `/health` → `{ status: "ok" }`
- **GET** `/v1/aircraft?center=40.6895,-74.1745&radius_nm=10` → list of Aircraft State
- **GET** `/v1/transcriptions?since=2025-10-03T12:30:00Z` → list of Transcription Event
- **GET** `/v1/conflicts?status=active` → list of Conflict Alert
- **GET** `/v1/aircraft/{callsign}` → Aircraft State + recent intentions + prediction

Example:
```bash
curl -s "${BACKEND_URL}/v1/conflicts?status=active" | jq .
```

### WebSocket Streaming
- **WS** `/v1/stream`
  - Messages contain an envelope `{ type, data }` where type ∈ `transcription|aircraft|conflict|metric`.

Client example (browser):
```typescript
const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/v1/stream`);
ws.onmessage = (evt) => {
  const msg = JSON.parse(evt.data);
  if (msg.type === 'conflict') {
    // update UI
  }
};
```

---

## Environment & Configuration

### Required Environment Variables
Backend (FastAPI):
- `GOOGLE_CLOUD_PROJECT` – Vertex AI project ID
- `GOOGLE_CLOUD_REGION` – e.g., `us-central1`
- `GEMINI_MODEL` – e.g., `gemini-2.5-flash`
- `GOOGLE_APPLICATION_CREDENTIALS` – path to service account JSON
- `LIVEATC_STREAM_URL` – KEWR tower stream
- `ADSB_LOL_BASE_URL` – default `https://api.adsb.lol/v2`
- `ADSB_LOL_API_KEY` – if required/available
- `KEWR_CENTER` – `40.6895,-74.1745`
- `RADIUS_NM` – ADS-B query radius, e.g., `15`
- `RENDER_HEALTHCHECK_TOKEN` – shared secret for keep-alive endpoint

Frontend (Next.js):
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`

Cloudflare Worker:
- `BACKEND_HEALTH_URL` – e.g., `https://<render-app>/health?token=...`

> Production secrets on Render/Vercel should be set via platform settings; do not commit `.env` files.

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker (optional for containerized dev)
- gcloud auth with Vertex AI access (service account JSON)

### Backend (FastAPI)
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Suggested `backend/requirements.txt`:
```text
fastapi==0.115.0
uvicorn[standard]==0.30.6
httpx==0.27.2
aiohttp==3.10.5
pydantic==2.9.2
numpy==2.1.1
scipy==1.13.1
google-cloud-aiplatform==1.70.0
websockets==13.0
python-dotenv==1.0.1
```

### Frontend (Next.js + Tailwind + HeroUI)
```bash
cd frontend
npm install
npm run dev -- -p 3000
```

Suggested `package.json` (partial):
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start -p 3000"
  },
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "react-dom": "18.x",
    "@heroui/react": "latest",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0"
  }
}
```

### Proposed Repository Layout
```
backend/
  main.py
  core/
  services/
  models/
  requirements.txt
frontend/
  app/
  components/
  styles/
  package.json
worker/
  src/index.ts
infra/
  docker/
  render/
  vercel/
docs/
README.md
```

---

## Deployment

### Backend (Render)
1. Containerize FastAPI backend with Docker.
2. Deploy to Render on a single 0.25 CPU Ubuntu instance (free tier for research).
3. Configure environment variables in Render dashboard.
4. Expose `/health?token=...` for Cloudflare Worker checks.

Example `Dockerfile` (backend):
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend
ENV PYTHONUNBUFFERED=1
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### Frontend (Vercel)
1. Import Git repository in Vercel.
2. Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` env vars.
3. Deploy on default Next.js preset.

### Cloudflare Worker (Keep-Alive)
Runs a scheduled cron to ping Render backend every 5 minutes.

```typescript
export default {
  async scheduled(_event: ScheduledEvent, env: any) {
    const url = env.BACKEND_HEALTH_URL;
    await fetch(url, { method: 'GET', headers: { 'cf-worker': 'keepalive' } });
  },
  async fetch() {
    return new Response('ok');
  }
}
```

`wrangler.toml` (partial):
```toml
name = "atc-keepalive"
main = "src/index.ts"
compatibility_date = "2025-10-03"

[triggers]
crons = ["*/5 * * * *"]

[vars]
BACKEND_HEALTH_URL = "https://<render-app>/health?token=<secret>"
```

---

## Algorithms (Prototype-Level)

### Intention Extraction
- Vertex AI streaming ASR with diarization → NER/rule-based templates for ATC phraseology.
- Canonicalize runways (e.g., "four left" → `04L`), headings (e.g., "heading one eight zero" → 180), and altitudes.

### Correlation & Tracking
- Resolve callsigns from transcript using nearest-in-time ADS-B callsign matches and spatial proximity to KEWR.
- If multiple candidates, choose the one minimizing a joint distance over callsign similarity, location, and kinematics.

### Trajectory Prediction
- Short-horizon constant-acceleration/turn-rate model conditioned by intention (e.g., lineup → zero groundspeed; cleared to land → continue approach along runway heading and glide path).

### Conflict Detection
- Compute predicted separation per 1–5 s step over horizon.
- Flag runway incursions (surface conflicts) and loss-of-separation (airborne) against airport-specific minima.
- Output severity, confidence, and time-to-conflict.

---

## Testing, Metrics, and Validation

### Test Plan
- Unit tests for parsers, correlators, predictors, and detectors.
- Integration tests with recorded audio and synchronized ADS-B snapshots.
- Property-based tests for numeric stability and boundary conditions.

### Dataset and Baseline
- Annotate a KEWR subset (e.g., 2–4 hours) with manual intentions.
- Compute **Intention Mapping Error Rate (IMER)** = errors / total intentions.
- Acceptance: **IMER < 5%**.

### Operational Metrics
- ASR latency (p50/p95), end-to-end alert latency, active conflicts, false positives/negatives, and stream uptime.

---

## Phase Timeline
- **Phase 1 (Sep 16 – Sep 30)**: Data integration, audio pipeline, Vertex AI integration, JSON schema.
- **Phase 2 (Sep 30 – Nov 1)**: ADS-B correlation and prediction models; validation.
- **Phase 3 (Nov 1 – Nov 25)**: Conflict engine, severity, confidence, time-to-conflict; KEWR rules.
- **Phase 4 (Nov 25 – Nov 28)**: Dockerize and deploy backend to Render; REST/WS; keep-alive.
- **Phase 5 (Nov 28 – Dec 5)**: Frontend dashboard (positions, conflicts, transcripts); mock APIs ok.
- **Phase 6 (Dec 5 – Dec 10)**: Map integration, UI polish, E2E tests.

---

## Deliverables
- Deployed backend (Render) + frontend (Vercel) with real-time streaming.
- High-level design docs (architecture, APIs, data flows).
- Performance analysis report showing IMER <5% vs. manual baseline.
- Final presentation and demo.
- Complete source repository with Docker and deployment scripts.
- Test plan and validation results.

---

## Legal, Safety, and Ethics
- LiveATC usage must comply with `LiveATC.net` terms. Do not re-distribute raw audio.
- Data is for research; do not depend on for navigation or ATC operations.
- Avoid storing PII; limit persistent logs and rotate.
- Document limitations and failure modes clearly in the UI.

---

## License
TBD (Academic/Research Only). Consider MIT/Apache-2.0 for code and a data usage notice.



---

## Database (Postgres + Prisma)

### Overview
- Local Postgres (Homebrew) with Prisma ORM in the frontend (`frontend/`)
- Database: `atc_project` on `localhost:5432` (schema `public`)
- Prisma models live in `frontend/prisma/schema.prisma`

### Install and start Postgres (macOS/Homebrew)
```bash
brew install postgresql@16
brew services start postgresql@16
# Data directory: /opt/homebrew/var/postgresql@16
```

### Create role and database
```bash
# Add psql to PATH for this shell
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

# Create login role for Prisma (idempotent if already exists)
psql -d postgres -c "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'atc_user') THEN CREATE ROLE atc_user LOGIN PASSWORD 'atc_password'; END IF; END $$;"

# Create database owned by that role
createdb -O atc_user atc_project || true

# Ensure schema ownership & privileges
psql -d atc_project -c "ALTER SCHEMA public OWNER TO atc_user; GRANT ALL ON SCHEMA public TO atc_user;"

# Allow Prisma to create a shadow DB during migrate
psql -d postgres -c "ALTER ROLE atc_user CREATEDB;"
```

### Configure Prisma connection
Create/update `frontend/.env` (not committed):
```env
DATABASE_URL=postgresql://atc_user:atc_password@localhost:5432/atc_project?schema=public
```

### Generate client and run migrations
```bash
cd frontend
npm i -D prisma && npm i @prisma/client   # if not installed yet
npx prisma generate
npx prisma migrate dev --name init
```

### Verify database contents
```bash
/opt/homebrew/opt/postgresql@16/bin/psql "postgresql://atc_user:atc_password@localhost:5432/atc_project"
-- inside psql
\dt            -- list tables
SELECT COUNT(*) FROM "Snapshot";
```

### Using Prisma in server code
Use the shared client in `frontend/lib/prisma.ts`:
```ts
import { prisma } from "@/lib/prisma";

export async function GET() {
  const snapshots = await prisma.snapshot.findMany({ take: 5, orderBy: { capturedAt: "desc" } });
  return Response.json(snapshots);
}
```

### Troubleshooting
- Check Postgres is listening:
```bash
pg_isready -h localhost -p 5432
```
- Prisma P1010 (user denied): ensure the role exists and the connection string is correct.
- Prisma P3014 (shadow DB): run `ALTER ROLE atc_user CREATEDB;` or use a superuser during migration.
- Drift detected: dev-only reset (drops all data):
```bash
cd frontend
npx prisma migrate reset --force --skip-seed   # dev only, destructive
```
