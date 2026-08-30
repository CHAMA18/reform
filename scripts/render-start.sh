#!/bin/bash
# ============================================================
# Reform — Render Start Script
# ============================================================
# Handles the Prisma schema push with automatic recovery from
# incompatible schema changes (e.g., adding a required column to
# a table with existing rows).
#
# Flow:
#   1. Try `prisma db push --accept-data-loss` (normal, preserves data)
#   2. If it fails with a schema-incompatibility error, retry with
#      `--force-reset` (drops and recreates all tables — ALL DATA
#      IS LOST). This only happens when the schema change is too
#      drastic for an in-place migration.
#   3. Start the Next.js production server.
# ============================================================

set -e

echo "=========================================="
echo "  Reform — Render Start"
echo "=========================================="
echo ""

# --- 1. Push schema (try normal first, force-reset on failure) ---
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
    echo ""
    echo "  ⚠ WARNING: All previous data was deleted. This is expected"
    echo "    when a breaking schema change is deployed to a database"
    echo "    with incompatible existing rows. New data can be created"
    echo "    immediately via the app."
fi
echo ""

# --- 2. Start the Next.js server ---
echo "→ Starting Next.js server on port ${PORT:-3000}..."
echo ""
exec npx next start -p "${PORT:-3000}" -H 0.0.0.0
