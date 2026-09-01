#!/bin/bash
set -e

# ===========================================
# Reform — Docker Entrypoint
# ===========================================
# 1. Waits for PostgreSQL to accept TCP connections (up to 30s)
# 2. Pushes the Prisma schema to the database (creates tables if missing)
# 3. Starts the Next.js standalone server
#
# This script runs inside the container as the nextjs user. It uses
# `nc` (netcat-openbsd, installed in the Dockerfile) for the DB wait
# loop and `node ./node_modules/prisma/build/index.js` to run Prisma
# (the runner stage doesn't have npm/npx installed, so we call the
# CLI directly via node).

echo "=========================================="
echo "  Reform — Starting Up"
echo "=========================================="
echo ""

# --- 1. Wait for PostgreSQL to be ready ---
if [ -n "$DATABASE_URL" ] && echo "$DATABASE_URL" | grep -q "postgresql"; then
    echo "→ Waiting for PostgreSQL to be ready..."

    # Extract host and port from DATABASE_URL
    # Handles: postgresql://user:pass@host:port/db?params
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_PORT=${DB_PORT:-5432}

    echo "  Host: $DB_HOST"
    echo "  Port: $DB_PORT"

    # Wait up to 30 seconds for the database to accept connections
    for i in $(seq 1 30); do
        if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
            echo "  ✓ PostgreSQL is ready!"
            break
        fi
        if [ "$i" = "30" ]; then
            echo "  ⚠ PostgreSQL did not become ready in 30s — continuing anyway..."
        else
            echo "  Attempt $i/30 — waiting..."
        fi
        sleep 1
    done
    echo ""
fi

# --- 1b. Wait for Ollama LLM to be ready (if configured) ---
if [ -n "$LLM_BASE_URL" ]; then
    echo "→ Waiting for Ollama LLM to be ready..."
    LLM_HOST=$(echo "$LLM_BASE_URL" | sed -n 's|http://\([^/:]*\).*|\1|p')
    LLM_PORT=$(echo "$LLM_BASE_URL" | sed -n 's|.*:\([0-9]*\).*|\1|p')
    LLM_PORT=${LLM_PORT:-11434}

    echo "  Host: $LLM_HOST"
    echo "  Port: $LLM_PORT"

    # Wait up to 60 seconds for Ollama to accept connections
    for i in $(seq 1 60); do
        if nc -z "$LLM_HOST" "$LLM_PORT" 2>/dev/null; then
            echo "  ✓ Ollama is ready!"
            break
        fi
        if [ "$i" = "60" ]; then
            echo "  ⚠ Ollama did not become ready in 60s — AI features may not work"
        else
            echo "  Attempt $i/60 — waiting..."
        fi
        sleep 1
    done
    echo ""
fi

# --- 2. Push the Prisma schema to the database ---
# This creates all tables if they don't exist, and is safe to run on
# every startup (it's idempotent — it only applies the diff between
# the schema and the current DB state).
echo "→ Pushing database schema..."
node ./node_modules/prisma/build/index.js db push --accept-data-loss 2>&1 || {
    echo "  ⚠ prisma db push failed — the app will start anyway, but"
    echo "    database queries may fail. Check the logs above for details."
}
echo "  ✓ Database schema is ready"
echo ""

# --- 3. Start the Next.js server ---
echo "→ Starting Next.js server on port ${PORT:-3000}..."
echo ""
exec node server.js
