#!/usr/bin/env bash
# ============================================================
# Reform — Local Development Quick Start
# ============================================================
# Spins up the app locally against a local PostgreSQL database.
#
# Prerequisites:
#   - Node.js 20+ (https://nodejs.org)
#   - PostgreSQL 16+ running on localhost:5432
#     (install via: brew install postgresql@16 && brew services start postgresql@16)
#     (or: sudo apt install postgresql && sudo systemctl start postgresql)
#
# Usage:
#   ./scripts/dev.sh            # Install deps, push schema, start dev server
#   ./scripts/dev.sh --reset    # Also reset the database (drops all data!)
#   ./scripts/dev.sh --build    # Build and run the production server instead
#
# The app will be available at http://localhost:3000
# ============================================================

set -euo pipefail

cd "$(dirname "$0")/.."

# --- Color helpers ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}▶${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
fail()  { echo -e "${RED}✗${NC} $1"; exit 1; }

# --- Parse args ---
RESET_DB=false
PROD_MODE=false
for arg in "$@"; do
  case "$arg" in
    --reset) RESET_DB=true ;;
    --build) PROD_MODE=true ;;
    *) warn "Unknown argument: $arg" ;;
  esac
done

# --- Check prerequisites ---
info "Checking prerequisites..."

if ! command -v node &>/dev/null; then
  fail "Node.js is not installed. Install it from https://nodejs.org"
fi
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  fail "Node.js 20+ is required (found v$NODE_VERSION)"
fi
ok "Node.js $(node -v)"

if ! command -v psql &>/dev/null; then
  warn "psql not found — make sure PostgreSQL is installed and running"
fi

# --- Load .env ---
if [ ! -f .env ]; then
  info "No .env found — creating one from .env.example"
  cp .env.example .env
  # Adjust DATABASE_URL to use localhost by default
  sed -i.bak 's|DATABASE_URL=.*|DATABASE_URL="postgresql://reform:reform_password@localhost:5432/reform?schema=public"|' .env
  rm -f .env.bak
  ok "Created .env from .env.example"
fi

# Source the .env file to get DATABASE_URL
set -a
source .env
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  fail "DATABASE_URL is not set in .env"
fi
ok "DATABASE_URL is set"

# --- Ensure the database + user exist ---
if echo "$DATABASE_URL" | grep -q "postgresql"; then
  info "Ensuring PostgreSQL database exists..."

  # Extract credentials from DATABASE_URL
  DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\\1|p')
  DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\\1|p')
  DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\\1|p')
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\\1|p')
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\\1|p')
  DB_PORT=${DB_PORT:-5432}

  info "  user: $DB_USER  db: $DB_NAME  host: $DB_HOST:$DB_PORT"

  # Try to create the user + database (ignore errors if they already exist)
  # We use `psql postgres` to connect to the default database first.
  if command -v psql &>/dev/null; then
    psql "postgres://$DB_HOST:$DB_PORT/postgres" -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
    psql "postgres://$DB_HOST:$DB_PORT/postgres" -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
    psql "postgres://$DB_HOST:$DB_PORT/postgres" -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
    ok "Database '$DB_NAME' and user '$DB_USER' are ready (or already existed)"
  else
    warn "psql not available — skipping database creation. Make sure '$DB_NAME' exists."
  fi
fi

# --- Install dependencies ---
if [ ! -d node_modules ]; then
  info "Installing dependencies (npm install)..."
  npm install
  ok "Dependencies installed"
else
  ok "node_modules exists — skipping npm install"
fi

# --- Generate Prisma client ---
info "Generating Prisma client..."
npx prisma generate
ok "Prisma client generated"

# --- Push schema / reset database ---
if [ "$RESET_DB" = true ]; then
  warn "Resetting database (--reset flag) — all data will be lost!"
  npx prisma db push --force-reset --accept-data-loss
  ok "Database reset and schema pushed"
else
  info "Pushing schema to database..."
  npx prisma db push --accept-data-loss
  ok "Schema is up to date"
fi

# --- Start the server ---
if [ "$PROD_MODE" = true ]; then
  info "Building production bundle..."
  npm run build
  ok "Build complete"
  info "Starting production server on http://localhost:3000 ..."
  echo ""
  exec npm start
else
  info "Starting dev server on http://localhost:3000 ..."
  echo ""
  exec npm run dev
fi
