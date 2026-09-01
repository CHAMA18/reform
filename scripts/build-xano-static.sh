#!/bin/bash
# ============================================================
# Reform — Build for Xano Static Hosting
# ============================================================
# Builds a static export of the Next.js app and uploads key
# files to Xano's file storage.
#
# The static export produces HTML/CSS/JS that can be served
# directly from Xano's /vault/ paths.
#
# Usage:
#   bash scripts/build-xano-static.sh
# ============================================================

set -e

echo "=========================================="
echo "  Reform — Xano Static Build"
echo "=========================================="
echo ""

# 1. Temporarily switch to static export mode
echo "→ Building Next.js static export..."
NEXT_TELEMETRY_DISABLED=1 npx next build --output export --outdir out-xano
echo "  ✓ Static export complete"
echo ""

# 2. Upload index.html to Xano
if [ -z "$XANO_TOKEN" ]; then
  echo "  ⚠ XANO_TOKEN not set — skipping upload"
  exit 0
fi

XANO_INSTANCE_API="${XANO_INSTANCE_API:-https://xt8f-5r1j-wrmy.n7e.xano.io/api:meta}"
XANO_WORKSPACE_ID="${XANO_WORKSPACE_ID:-2}"

echo "→ Uploading to Xano file storage..."
for file in out-xano/index.html; do
  if [ -f "$file" ]; then
    echo "  Uploading $(basename $file)..."
    curl -sS -X POST "$XANO_INSTANCE_API/workspace/$XANO_WORKSPACE_ID/file" \
      -H "Authorization: Bearer $XANO_TOKEN" \
      -F "content=@$file" \
      -F "name=$(basename $file)" \
      --max-time 30 | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'    ✅ {data.get(\"name\")} → {data.get(\"path\",\"?\")[:60]}...')
" 2>&1
  fi
done

echo ""
echo "=========================================="
echo "  Xano static build complete ✓"
echo "=========================================="
