#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/logs"

mkdir -p "$LOG_DIR"

BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

echo "Logs:"
echo "  Backend -> $BACKEND_LOG"
echo "  Frontend -> $FRONTEND_LOG"

# PIDs for cleanup
BACKEND_PID=""
FRONTEND_PID=""
TAIL_BACKEND_PID=""
TAIL_FRONTEND_PID=""

free_port() {
  local port="$1"
  local pids
  # Find PIDs listening on the port (macOS compatible)
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "Killing processes on port $port: $pids"
    kill -9 $pids 2>/dev/null || true
  fi
}

cleanup() {
  echo ""
  echo "Shutting down..."

  # Stop log tailers first
  if [[ -n "$TAIL_FRONTEND_PID" ]] && ps -p "$TAIL_FRONTEND_PID" >/dev/null 2>&1; then
    kill "$TAIL_FRONTEND_PID" 2>/dev/null || true
    wait "$TAIL_FRONTEND_PID" 2>/dev/null || true
  fi
  if [[ -n "$TAIL_BACKEND_PID" ]] && ps -p "$TAIL_BACKEND_PID" >/dev/null 2>&1; then
    kill "$TAIL_BACKEND_PID" 2>/dev/null || true
    wait "$TAIL_BACKEND_PID" 2>/dev/null || true
  fi

  # Gracefully stop app processes
  if [[ -n "$FRONTEND_PID" ]] && ps -p "$FRONTEND_PID" >/dev/null 2>&1; then
    echo "Stopping frontend (pid $FRONTEND_PID)"
    kill "$FRONTEND_PID" 2>/dev/null || true
    # If still alive after a moment, force kill
    sleep 0.3
    ps -p "$FRONTEND_PID" >/dev/null 2>&1 && kill -9 "$FRONTEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
  fi
  if [[ -n "$BACKEND_PID" ]] && ps -p "$BACKEND_PID" >/dev/null 2>&1; then
    echo "Stopping backend (pid $BACKEND_PID)"
    kill "$BACKEND_PID" 2>/dev/null || true
    sleep 0.3
    ps -p "$BACKEND_PID" >/dev/null 2>&1 && kill -9 "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi

  # Ensure ports are free on exit
  free_port 3000
  free_port 8000
}

trap cleanup EXIT INT TERM

# Ensure ports are free before starting
free_port 3000
free_port 8000

echo "Starting backend (uvicorn)..."
cd "$BACKEND_DIR"
# Prefer local venv if present
if [[ -f ".venv/bin/activate" ]]; then
  source .venv/bin/activate
fi
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload >> "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
cd "$ROOT_DIR"

echo "Starting frontend (next dev)..."
cd "$FRONTEND_DIR"
npm run dev >> "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
cd "$ROOT_DIR"

# Mirror logs to console
tail -n 0 -F "$BACKEND_LOG" &
TAIL_BACKEND_PID=$!
tail -n 0 -F "$FRONTEND_LOG" &
TAIL_FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Press Ctrl+C to stop both. Output is mirrored to console and logged."

# Wait on both
wait "$BACKEND_PID" "$FRONTEND_PID"


