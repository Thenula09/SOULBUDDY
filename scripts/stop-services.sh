#!/usr/bin/env bash
set -euo pipefail

echo "Stopping services on ports 8000,8001,8002,8003,8004,8005..."
for p in 8000 8001 8002 8003 8004 8005; do
  lsof -ti:"$p" -sTCP:LISTEN | xargs -r kill -9 || true
done
sleep 0.5

echo "Stopped."