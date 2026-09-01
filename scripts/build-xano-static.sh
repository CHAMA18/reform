#!/bin/bash
# ============================================================
# Reform — Build for Xano Static Hosting
# ============================================================
# Builds a static export of the Next.js app (frontend pages only).
# API routes are temporarily moved out so they don't break the
# static export (Next.js 16 requires all routes to be statically
# renderable when output: "export" is set).
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

# 2. Temporarily move API routes and dynamic route pages OUT of src/app/
#    - API routes use server-side features (can't be statically exported)
#    - Dynamic route pages ([id], [shareId]) need generateStaticParams()
#      which doesn't make sense for a static landing page build
echo "→ Moving API routes + dynamic pages out temporarily..."
mv src/app/api /tmp/reform-api-backup
# Move all directories containing [id] or [shareId]
mkdir -p /tmp/reform-dynamic-backup
for dir in src/app/forms/\[id\] src/app/f/\[shareId\] src/app/embed/\[shareId\] src/app/submissions/\[id\]; do
  if [ -d "$dir" ]; then
    mkdir -p "/tmp/reform-dynamic-backup/$(dirname ${dir#src/app/})"
    mv "$dir" "/tmp/reform-dynamic-backup/${dir#src/app/}"
  fi
done

# 3. Build — use npx next build directly (not npm run build which has
#    standalone-specific post-build copy commands)
echo "→ Building Next.js static export..."
NEXT_TELEMETRY_DISABLED=1 npx next build 2>&1 || true
echo "  ✓ Static export complete"
echo ""

# 4. Restore API routes + dynamic pages
echo "→ Restoring API routes + dynamic pages..."
mv /tmp/reform-api-backup src/app/api
# Restore dynamic route pages
if [ -d /tmp/reform-dynamic-backup ]; then
  cp -r /tmp/reform-dynamic-backup/* src/app/ 2>/dev/null || true
  rm -rf /tmp/reform-dynamic-backup
fi
echo "  ✓ API routes restored"
echo ""

# 5. Restore the original config
echo "→ Restoring original config..."
mv next.config.ts.bak next.config.ts
echo "  ✓ Config restored"
echo ""

# 6. Check output
if [ -d "out" ] && [ -f "out/index.html" ]; then
  echo "→ Static files generated in ./out/"
  ls -la out/ | head -10
  echo ""
else
  echo "  ⚠ No ./out/index.html found — build may have failed"
  echo "  Check the build output above for errors"
  exit 1
fi

# 7. Upload to Xano (optional)
if [ -z "$XANO_TOKEN" ]; then
  echo "  ⚠ XANO_TOKEN not set — skipping upload"
  echo "  Static files are in ./out/"
  exit 0
fi

XANO_INSTANCE_API="${XANO_INSTANCE_API:-https://xt8f-5r1j-wrmy.n7e.xano.io/api:meta}"
XANO_WORKSPACE_ID="${XANO_WORKSPACE_ID:-2}"

echo "→ Uploading to Xano file storage..."
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
