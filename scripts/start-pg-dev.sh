#!/bin/bash
# Start the dev server against PostgreSQL
export PATH="/home/z/pg/bin:$PATH"
export DATABASE_URL="postgresql://reform:reform_password@localhost:5432/reform?schema=public"
export NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder-anon-key"
export NODE_ENV="development"

# Kill any stale server
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 2

# Start the dev server
cd /home/z/my-project
setsid bun next dev -p 3000 </dev/null >/home/z/my-project/dev.log 2>&1 &
disown

# Wait for it to be ready
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:3000/ -o /dev/null 2>/dev/null; then
    echo "Server ready on attempt $i"
    exit 0
  fi
  sleep 1
done
echo "Server failed to start"
exit 1
