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

# --- 3. Write the z-ai-web-dev-sdk config from the Z_AI_CONFIG env var ---
# z-ai-web-dev-sdk needs a .z-ai-config file to authenticate with the
# inference API. The file contains a JWT token + chat ID that the SDK
# uses to make LLM calls. We don't commit it (it's a secret) — instead
# we write it at build time from an env var set on the Render service.
if [ -n "$Z_AI_CONFIG" ]; then
  echo "→ Writing .z-ai-config from Z_AI_CONFIG env var..."
  echo "$Z_AI_CONFIG" > .z-ai-config
  chmod 600 .z-ai-config
  echo "  ✓ .z-ai-config written (redacted)"
else
  echo "  ⚠ Z_AI_CONFIG env var not set — AI features (form generation,"
  echo "    submission insights, smart field suggestions, etc.) will fail."
  echo "    Set Z_AI_CONFIG in the Render dashboard to enable them."
fi
echo ""

echo "=========================================="
echo "  Build complete ✓"
echo "=========================================="
echo ""
echo "Backend: Xano Metadata API"
echo "  XANO_INSTANCE_API:  ${XANO_INSTANCE_API:-(not set)}"
echo "  XANO_WORKSPACE_ID:  ${XANO_WORKSPACE_ID:-(not set)}"
echo "  XANO_TOKEN:         ${XANO_TOKEN:+set (redacted)}"
echo "  Z_AI_CONFIG:        ${Z_AI_CONFIG:+set (redacted)}"
