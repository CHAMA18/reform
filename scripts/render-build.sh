#!/bin/bash
# ============================================================
# Reform — Render Build Script (Xano backend)
# ============================================================
# Runs during the Render BUILD phase.
#
# Xano is the backend — there's no local database to push a schema to.
# The Xano tables (user, form, submission, etc.) were provisioned at
# setup time via the Xano metadata API. So this build script is simple:
# install deps + build Next.js.
#
# Flow:
#   1. npm install
#   2. npm run build (Next.js standalone output)
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

# --- 2. Build Next.js ---
echo "→ Building Next.js..."
NEXT_TELEMETRY_DISABLED=1 npm run build
echo "  ✓ Next.js build complete"
echo ""

echo "=========================================="
echo "  Build complete ✓"
echo "=========================================="
echo ""
echo "Backend: Xano Metadata API"
echo "  XANO_INSTANCE_API:  ${XANO_INSTANCE_API:-(not set)}"
echo "  XANO_WORKSPACE_ID:  ${XANO_WORKSPACE_ID:-(not set)}"
echo "  XANO_TOKEN:         ${XANO_TOKEN:+set (redacted)}"
