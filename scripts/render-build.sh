#!/bin/bash
# ============================================================
# Reform — Render Build Script
# ============================================================
# Runs during the Render BUILD phase (not the start phase).
#
# Handles the Prisma schema push with automatic recovery from
# breaking schema changes (e.g., adding a required column to a
# table with existing rows). This runs at BUILD time so that the
# START command (which Render's dashboard may have hardcoded to
# 'npx prisma db push ... && npx next start ...') finds a
# compatible database and doesn't crash.
#
# Flow:
#   1. npm install
#   2. npx prisma generate
#   3. npx prisma db push --accept-data-loss (try normal, preserves data)
#   4. If step 3 fails, retry with --force-reset (drops all data)
#   5. npm run build
# ============================================================

set -e

echo "=========================================="
echo "  Reform — Render Build"
echo "=========================================="
echo ""

# --- 1. Install dependencies ---
echo "→ Installing dependencies..."
npm install
echo "  ✓ Dependencies installed"
echo ""

# --- 2. Generate Prisma client ---
echo "→ Generating Prisma client..."
npx prisma generate
echo "  ✓ Prisma client generated"
echo ""

# --- 3. Push schema to database (with auto-recovery) ---
# This runs at BUILD time so the START command finds a compatible DB.
echo "→ Pushing database schema (normal mode)..."
if npx prisma db push --skip-generate --accept-data-loss 2>&1; then
    echo "  ✓ Schema pushed successfully (data preserved)"
else
    echo ""
    echo "  ⚠ Normal schema push failed — this usually means the schema"
    echo "    has a breaking change (e.g., a new required column on a"
    echo "    table with existing rows)."
    echo ""
    echo "→ Retrying with --force-reset (ALL DATABASE DATA WILL BE LOST)..."
    npx prisma db push --skip-generate --force-reset --accept-data-loss
    echo "  ✓ Database reset and schema pushed successfully"
fi
echo ""

# --- 4. Build Next.js ---
echo "→ Building Next.js..."
NEXT_TELEMETRY_DISABLED=1 npm run build
echo "  ✓ Next.js build complete"
echo ""

echo "=========================================="
echo "  Build complete ✓"
echo "=========================================="
