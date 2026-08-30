#!/bin/bash
# ============================================================
# Reform — Render Start Script (Xano backend)
# ============================================================
# Starts the Next.js production server.
#
# No database setup is needed — Xano is the backend, and the tables
# were provisioned via the Xano metadata API at setup time.
#
# Required environment variables (set in Render dashboard):
#   XANO_INSTANCE_API  — e.g. https://your-instance.xano.io/api:meta
#   XANO_TOKEN         — Xano metadata API bearer token
#   XANO_WORKSPACE_ID  — workspace ID (default: 2)
#   NODE_ENV           — production
# ============================================================

set -e

echo "=========================================="
echo "  Reform — Render Start"
echo "=========================================="
echo ""
echo "Backend: Xano Metadata API"
echo "  XANO_INSTANCE_API:  ${XANO_INSTANCE_API:-(NOT SET — app will fail to start)}"
echo "  XANO_WORKSPACE_ID:  ${XANO_WORKSPACE_ID:-(defaulting to 2)}"
if [ -z "$XANO_TOKEN" ]; then
  echo "  XANO_TOKEN:         (NOT SET — app will fail to start)"
  exit 1
else
  echo "  XANO_TOKEN:         set (redacted)"
fi
echo ""

# Start the Next.js server
echo "→ Starting Next.js server on port ${PORT:-3000}..."
echo ""
exec npx next start -p "${PORT:-3000}" -H 0.0.0.0
