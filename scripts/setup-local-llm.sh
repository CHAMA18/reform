#!/bin/bash
# ============================================================
# Reform — Local LLM Setup Script
# ============================================================
# Sets up a local LLM server for Reform's AI features using
# Ollama (OpenAI-compatible API).
#
# Usage:
#   ./scripts/setup-local-llm.sh          # Full setup (install + start)
#   ./scripts/setup-local-llm.sh --start  # Just start the server
#   ./scripts/setup-local-llm.sh --stop   # Stop the server
#   ./scripts/setup-local-llm.sh --status # Check if server is running
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

LLM_BASE_URL="${LLM_BASE_URL:-http://localhost:11434/v1}"
LLM_MODEL="${LLM_MODEL:-llama3.2}"

print_header() {
  echo ""
  echo -e "${BLUE}==========================================${NC}"
  echo -e "${BLUE}  Reform — Local LLM Setup${NC}"
  echo -e "${BLUE}==========================================${NC}"
  echo ""
}

check_ollama_installed() {
  if command -v ollama &> /dev/null; then
    return 0
  else
    return 1
  fi
}

check_server_running() {
  curl -s "${LLM_BASE_URL}/../api/tags" &> /dev/null
  return $?
}

install_ollama() {
  echo -e "${YELLOW}→ Installing Ollama...${NC}"
  echo ""

  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if command -v brew &> /dev/null; then
      echo "  Using Homebrew..."
      brew install ollama
    else
      echo "  Downloading from ollama.com..."
      curl -fsSL https://ollama.com/install.sh | sh
    fi
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "  Downloading from ollama.com..."
    curl -fsSL https://ollama.com/install.sh | sh
  else
    echo -e "${RED}  Unsupported OS: $OSTYPE${NC}"
    echo "  Please install Ollama manually: https://ollama.com/download"
    exit 1
  fi

  echo -e "${GREEN}  ✓ Ollama installed${NC}"
  echo ""
}

pull_model() {
  echo -e "${YELLOW}→ Pulling model: ${LLM_MODEL}...${NC}"
  echo "  (This may take a few minutes on first run)"
  echo ""

  ollama pull "$LLM_MODEL"

  echo ""
  echo -e "${GREEN}  ✓ Model ${LLM_MODEL} ready${NC}"
  echo ""
}

start_server() {
  echo -e "${YELLOW}→ Starting Ollama server...${NC}"

  # Check if already running
  if check_server_running; then
    echo -e "${GREEN}  ✓ Server already running at ${LLM_BASE_URL}${NC}"
    return 0
  fi

  # Start in background
  nohup ollama serve > /tmp/ollama.log 2>&1 &
  OLLAMA_PID=$!

  # Wait for server to be ready
  echo "  Waiting for server to start..."
  for i in {1..30}; do
    if check_server_running; then
      echo -e "${GREEN}  ✓ Server running (PID: ${OLLAMA_PID})${NC}"
      echo -e "${GREEN}  ✓ API endpoint: ${LLM_BASE_URL}${NC}"
      return 0
    fi
    sleep 1
  done

  echo -e "${RED}  ✗ Server failed to start. Check /tmp/ollama.log${NC}"
  return 1
}

stop_server() {
  echo -e "${YELLOW}→ Stopping Ollama server...${NC}"

  if [[ "$OSTYPE" == "darwin"* ]]; then
    pkill -f "ollama serve" 2>/dev/null || true
  else
    pkill -f "ollama serve" 2>/dev/null || true
  fi

  echo -e "${GREEN}  ✓ Server stopped${NC}"
}

show_status() {
  echo -e "${YELLOW}→ Checking LLM server status...${NC}"
  echo ""

  if check_server_running; then
    echo -e "${GREEN}  ✓ Server is running${NC}"
    echo -e "  Endpoint: ${LLM_BASE_URL}"
    echo ""

    # List available models
    echo "  Available models:"
    ollama list 2>/dev/null || echo "  (could not list models)"
  else
    echo -e "${RED}  ✗ Server is not running${NC}"
    echo ""
    echo "  Start with: ./scripts/setup-local-llm.sh --start"
  fi
  echo ""
}

show_usage() {
  echo "Usage:"
  echo "  ./scripts/setup-local-llm.sh          # Full setup (install + pull + start)"
  echo "  ./scripts/setup-local-llm.sh --start  # Just start the server"
  echo "  ./scripts/setup-local-llm.sh --stop   # Stop the server"
  echo "  ./scripts/setup-local-llm.sh --status # Check server status"
  echo ""
  echo "Environment variables:"
  echo "  LLM_BASE_URL  — API endpoint (default: http://localhost:11434/v1)"
  echo "  LLM_MODEL     — Model to use (default: llama3.2)"
  echo ""
  echo "Supported models (via Ollama):"
  echo "  llama3.2       — Fast, good quality (default)"
  echo "  llama3.1       — Larger, better quality"
  echo "  mistral        — Fast, good for code"
  echo "  codellama      — Best for code tasks"
  echo "  phi3           — Small, fast"
  echo "  gemma2         — Google's model"
  echo ""
  echo "Examples:"
  echo "  LLM_MODEL=mistral ./scripts/setup-local-llm.sh"
  echo "  LLM_BASE_URL=http://localhost:1234/v1 ./scripts/setup-local-llm.sh --start"
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
    # Full setup
    if ! check_ollama_installed; then
      install_ollama
    else
      echo -e "${GREEN}  ✓ Ollama already installed${NC}"
      echo ""
    fi

    pull_model
    start_server

    echo ""
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${GREEN}  Setup complete!${NC}"
    echo -e "${GREEN}==========================================${NC}"
    echo ""
    echo "  LLM endpoint: ${LLM_BASE_URL}"
    echo "  Model:        ${LLM_MODEL}"
    echo ""
    echo "  Add to your .env file:"
    echo "    LLM_BASE_URL=${LLM_BASE_URL}"
    echo "    LLM_API_KEY=ollama"
    echo "    LLM_MODEL=${LLM_MODEL}"
    echo ""
    echo "  Test the connection:"
    echo "    curl ${LLM_BASE_URL}/chat/completions \\"
    echo "      -H 'Content-Type: application/json' \\"
    echo "      -d '{\"model\":\"${LLM_MODEL}\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}'"
    echo ""
    ;;
esac
