#!/bin/bash
# ===========================================
# Start Docker (rootless) in this sandbox
# ===========================================
# Docker was installed rootlessly using static binaries + unshare.
# The daemon runs in a user namespace and persists as long as this script runs.

export PATH="/home/z/docker-bin:/home/z/docker-bin/docker:$PATH"
export DOCKER_HOST=unix:///home/z/.docker/run/docker.sock

# Kill any existing dockerd
pkill -f dockerd 2>/dev/null || true
pkill -f "unshare.*docker" 2>/dev/null || true
sleep 2

# Clean up
rm -rf /home/z/.docker/run /home/z/.docker/data
mkdir -p /home/z/.docker/run /home/z/.docker/data

echo "Starting Docker daemon (rootless)..."

# Start dockerd in a persistent user namespace
setsid bash -c '
  export PATH="/home/z/docker-bin:/home/z/docker-bin/docker:$PATH"
  unshare --user --map-root-user --mount --fork bash -c "
    export PATH=/home/z/docker-bin:/home/z/docker-bin/docker:\$PATH
    mount -t tmpfs tmpfs /run
    mkdir -p /run/docker/plugins
    /home/z/docker-bin/docker/dockerd \
      -H unix:///home/z/.docker/run/docker.sock \
      --data-root=/home/z/.docker/data \
      --exec-root=/home/z/.docker/run \
      --pidfile=/home/z/.docker/run/docker.pid \
      --storage-driver=vfs \
      --iptables=false --ip6tables=false \
      --bridge=none --ip-forward=false --ip-masq=false --userland-proxy=false &
    wait
  "
' </dev/null > /home/z/.docker/dockerd.log 2>&1 &
disown

# Wait for the daemon to be ready
for i in $(seq 1 20); do
  if docker info >/dev/null 2>&1; then
    echo "Docker is ready! (attempt $i)"
    docker version 2>&1 | grep "Server Version"
    return 0
  fi
  sleep 1
done

echo "Docker failed to start. Check /home/z/.docker/dockerd.log"
return 1
