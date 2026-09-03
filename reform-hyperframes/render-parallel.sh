#!/bin/bash
# render-parallel.sh — capture 5400 demo frames (180s × 30fps) with 4 parallel Chrome ranges, then encode.
#   ./render-parallel.sh wipe   # first run: clear stale frames
#   ./render-parallel.sh        # resume + continue until done (safe to re-run if interrupted)
cd "$(dirname "$0")"
export VIDEO_FPS=30 VIDEO_CRF=14 VIDEO_PRESET=slow
if [ "$1" = "wipe" ]; then
  echo "wiping stale frames"
  rm -rf frames-demo
fi
mkdir -p frames-demo out
pkill -f chrome-headless-shell 2>/dev/null
sleep 1

pids=()
i=0
while [ $i -lt 4 ]; do
  a=$((i * 1350)); b=$((a + 1349))
  RESUME=1 FRAME_START=$a FRAME_END=$b SKIP_ENCODE=1 node render-demo.js > "out/range-$a.log" 2>&1 &
  pids+=($!)
  i=$((i + 1))
done

ok=0
for p in "${pids[@]}"; do wait "$p" && ok=$((ok + 1)); done
echo "ranges finished: $ok/4"
n=$(ls frames-demo 2>/dev/null | wc -l | tr -d ' ')
echo "frames: $n/5400"
if [ "$n" -ge 5400 ]; then
  echo "all frames present — encoding final mp4"
  AUDIO_ONLY=1 node render-demo.js > out/encode.log 2>&1
  echo "encode exit: $?"
  exit 0
fi
echo "partial — re-run to continue"
exit 3
