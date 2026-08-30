#!/bin/bash
# Pings the Render app every 5 minutes to prevent it from sleeping
# (Render free tier sleeps after 15 minutes of inactivity)

URL="https://reform.onrender.com/"
INTERVAL=300  # 5 minutes

echo "Starting uptime pinger for $URL (every ${INTERVAL}s)"

while true; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$URL" 2>/dev/null)
  echo "[$TIMESTAMP] Ping: HTTP $HTTP_CODE"
  sleep $INTERVAL
done
