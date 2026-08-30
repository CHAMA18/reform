#!/bin/bash
# Bulletproof dev-server launcher.
# Double-forks, closes all stdio, detaches from session, so the process
# survives the parent bash shell exiting.
set -e

PROJECT_DIR="/home/z/my-project"
LOG_FILE="$PROJECT_DIR/dev.log"
PID_FILE="$PROJECT_DIR/dev.pid"

# Kill any stale dev server
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Killing stale dev server (PID $OLD_PID)..."
    kill "$OLD_PID" 2>/dev/null || true
    sleep 2
    kill -9 "$OLD_PID" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
fi
# Also kill any stray next-server processes
pkill -f "next-server" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 1

cd "$PROJECT_DIR"

# Clear old log
: > "$LOG_FILE"

# Launch with full detachment:
#  - setsid: new session, no controlling terminal
#  - </dev/null: no stdin
#  - >$LOG_FILE 2>&1: combined stdout+stderr to log
#  - &: background
#  - disown: remove from shell job table
setsid bash -c '
  cd /home/z/my-project
  exec bun next dev -p 3000
' </dev/null >"$LOG_FILE" 2>&1 &
DEV_PID=$!
disown

echo "$DEV_PID" > "$PID_FILE"
echo "Launched dev server, initial PID: $DEV_PID"
echo "Log: $LOG_FILE"
echo "PID file: $PID_FILE"

# Wait for readiness (up to 60s)
for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:3000/ -o /dev/null 2>/dev/null; then
    echo "READY on attempt $i (HTTP 200 from /)"
    exit 0
  fi
  # Check if process died
  if ! kill -0 "$DEV_PID" 2>/dev/null; then
    echo "ERROR: dev process died on attempt $i"
    echo "--- last 30 log lines ---"
    tail -30 "$LOG_FILE" 2>/dev/null
    exit 1
  fi
  sleep 1
done

echo "TIMEOUT: server not ready in 60s"
tail -30 "$LOG_FILE" 2>/dev/null
exit 1
