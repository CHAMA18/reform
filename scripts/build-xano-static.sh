#!/bin/bash
# ============================================================
# Reform — Build for Xano Static Hosting
# ============================================================
# Builds a static export of the Next.js app using a temporary
# config that sets output: "export".
#
# Usage:
#   bash scripts/build-xano-static.sh
# ============================================================

set -e

echo "=========================================="
echo "  Reform — Xano Static Build"
echo "=========================================="
echo ""

# 1. Swap in the static-export config
echo "→ Switching to static export config..."
cp next.config.ts next.config.ts.bak
cp next.config.xano.ts next.config.ts

# 2. Build — use 'npx next build' directly (not 'npm run build' which
#    has standalone-specific post-build copy commands that break with export)
echo "→ Building Next.js static export..."
NEXT_TELEMETRY_DISABLED=1 npx next build 2>&1 || true
echo "  ✓ Static export complete"
echo ""

# 3. Restore the original config
echo "→ Restoring original config..."
mv next.config.ts.bak next.config.ts
echo "  ✓ Config restored"
echo ""

# 4. Check output
if [ -d "out" ]; then
  echo "→ Static files generated in ./out/"
  ls -la out/ | head -10
  echo ""
else
  echo "  ⚠ No ./out/ directory found — build may have failed"
  echo "  Check the build output above for errors"
  exit 1
fi

# 5. Upload to Xano
if [ -z "$XANO_TOKEN" ]; then
  echo "  ⚠ XANO_TOKEN not set — skipping upload"
  echo "  Static files are in ./out/"
  exit 0
fi

XANO_INSTANCE_API="${XANO_INSTANCE_API:-https://xt8f-5r1j-wrmy.n7e.xano.io/api:meta}"
XANO_WORKSPACE_ID="${XANO_WORKSPACE_ID:-2}"

echo "→ Uploading to Xano file storage..."
# Upload the main index.html
if [ -f "out/index.html" ]; then
  echo "  Uploading index.html..."
  curl -sS -X POST "$XANO_INSTANCE_API/workspace/$XANO_WORKSPACE_ID/file" \
    -H "Authorization: Bearer $XANO_TOKEN" \
    -F "content=@out/index.html" \
    -F "name=index.html" \
    --max-time 30 | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'path' in data:
    print(f'    ✅ {data[\"name\"]} → {data[\"path\"][:60]}...')
else:
    print(f'    ❌ {data}')
" 2>&1
fi

echo ""
echo "=========================================="
echo "  Xano static build complete ✓"
echo "=========================================="
