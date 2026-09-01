#!/bin/bash
# ============================================================
# Reform — Start Local Whisper ASR Server
# ============================================================
# Starts a local Whisper transcription server for Reform's
# voice-first form submissions.
#
# Usage:
#   ./scripts/start-whisper.sh           # Start with base model
#   ./scripts/start-whisper.sh --model small  # Use a larger model
#   ./scripts/start-whisper.sh --status  # Check if server is running
#   ./scripts/start-whisper.sh --stop    # Stop the server
#
# First run: downloads the model (~150MB for base, ~500MB for small)
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VENV_DIR="$PROJECT_DIR/.venv-whisper"
PID_FILE="/tmp/reform-whisper.pid"
LOG_FILE="/tmp/reform-whisper.log"
PORT="${ASR_PORT:-9000}"
MODEL="${WHISPER_MODEL:-base}"

print_header() {
  echo ""
  echo -e "${BLUE}==========================================${NC}"
  echo -e "${BLUE}  Reform — Whisper ASR Server${NC}"
  echo -e "${BLUE}==========================================${NC}"
  echo ""
}

check_server_running() {
  curl -s "http://localhost:$PORT/health" 2>/dev/null | grep -q '"status"'
  return $?
}

ensure_venv() {
  if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}→ Creating Python virtual environment...${NC}"
    uv venv "$VENV_DIR" --python 3.14 2>&1
    echo -e "${GREEN}  ✓ Virtual environment created${NC}"
  fi

  # Check if faster-whisper is installed
  if ! "$VENV_DIR/bin/python" -c "import faster_whisper" 2>/dev/null; then
    echo -e "${YELLOW}→ Installing faster-whisper...${NC}"
    "$VENV_DIR/bin/pip" install faster-whisper 2>&1 | tail -3
    echo -e "${GREEN}  ✓ faster-whisper installed${NC}"
  fi
}

start_server() {
  if check_server_running; then
    echo -e "${GREEN}  ✓ Whisper server already running on port $PORT${NC}"
    return 0
  fi

  ensure_venv

  echo -e "${YELLOW}→ Starting Whisper server (model: $MODEL)...${NC}"
  echo "  First run may download the model (~150MB for base)"
  echo ""

  nohup "$VENV_DIR/bin/python" "$SCRIPT_DIR/whisper-server.py" \
    --model "$MODEL" \
    --port "$PORT" \
    > "$LOG_FILE" 2>&1 &

  echo $! > "$PID_FILE"

  # Wait for server to be ready
  echo "  Waiting for server to start..."
  for i in {1..60}; do
    if check_server_running; then
      echo -e "${GREEN}  ✓ Server running (PID: $(cat $PID_FILE))${NC}"
      echo -e "${GREEN}  ✓ Endpoint: http://localhost:$PORT${NC}"
      return 0
    fi
    # Check if process died
    if ! kill -0 $(cat "$PID_FILE" 2>/dev/null) 2>/dev/null; then
      echo -e "${RED}  ✗ Server process died. Check log: $LOG_FILE${NC}"
      tail -20 "$LOG_FILE" 2>/dev/null
      return 1
    fi
    sleep 1
  done

  echo -e "${RED}  ✗ Server failed to start within 60s${NC}"
  echo "  Log: $LOG_FILE"
  tail -20 "$LOG_FILE" 2>/dev/null
  return 1
}

stop_server() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      echo -e "${YELLOW}→ Stopping Whisper server (PID: $PID)...${NC}"
      kill "$PID" 2>/dev/null
      sleep 1
      kill -9 "$PID" 2>/dev/null || true
      rm -f "$PID_FILE"
      echo -e "${GREEN}  ✓ Server stopped${NC}"
    else
      echo -e "${YELLOW}  Process $PID not running, cleaning up${NC}"
      rm -f "$PID_FILE"
    fi
  else
    echo -e "${YELLOW}  No PID file found${NC}"
  fi
}

show_status() {
  echo -e "${YELLOW}→ Checking Whisper server status...${NC}"
  echo ""

  if check_server_running; then
    echo -e "${GREEN}  ✓ Server is running${NC}"
    HEALTH=$(curl -s "http://localhost:$PORT/health" 2>/dev/null)
    echo "  Port:   $PORT"
    echo "  Health: $HEALTH"
  else
    echo -e "${RED}  ✗ Server is not running${NC}"
    echo ""
    echo "  Start with: ./scripts/start-whisper.sh"
  fi
  echo ""
}

show_usage() {
  echo "Usage:"
  echo "  ./scripts/start-whisper.sh                # Start with base model"
  echo "  ./scripts/start-whisper.sh --model small   # Use a larger model"
  echo "  ./scripts/start-whisper.sh --port 8080     # Custom port"
  echo "  ./scripts/start-whisper.sh --stop          # Stop the server"
  echo "  ./scripts/start-whisper.sh --status        # Check server status"
  echo ""
  echo "Models:"
  echo "  tiny    — ~75MB, fast, lower accuracy"
  echo "  base    — ~150MB, good balance (default)"
  echo "  small   — ~500MB, better accuracy"
  echo "  medium  — ~1.5GB, high accuracy"
  echo "  large-v3 — ~3GB, best accuracy"
}

# Main
print_header

case "${1:-}" in
  --start)
    start_server
    ;;
  --stop)
    stop_server
    ;;
  --status)
    show_status
    ;;
  --help|-h)
    show_usage
    ;;
  *)
    # Parse optional flags
    while [[ $# -gt 0 ]]; do
      case $1 in
        --model) MODEL="$2"; shift 2 ;;
        --port) PORT="$2"; shift 2 ;;
        --device) export WHISPER_DEVICE="$2"; shift 2 ;;
        *) shift ;;
      esac
    done
    start_server
    ;;
esac
