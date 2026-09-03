#!/bin/bash
set -e

echo "=========================================="
echo "  Reform — Render Build"
echo "=========================================="
echo ""

echo "→ Installing dependencies..."
npm install
echo "  ✓ Dependencies installed"
echo ""

echo "→ Building Next.js..."
NEXT_TELEMETRY_DISABLED=1 npx next build
echo "  ✓ Next.js build complete"
echo ""

# Copy static assets for standalone mode
if [ -d ".next/standalone" ]; then
  echo "→ Copying static assets..."
  cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
  cp -r public .next/standalone/ 2>/dev/null || true
  echo "  ✓ Static assets copied"
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
echo "  LLM_BASE_URL:       ${LLM_BASE_URL:-(not set, using localhost)}"
echo "  LLM_MODEL:          ${LLM_MODEL:-(not set, using llama3.2)}"
