#!/usr/bin/env bash
set -euo pipefail

echo "Stopping services on ports 8002,8003,8004..."
lsof -ti:8002 -sTCP:LISTEN | xargs -r kill -9 || true
lsof -ti:8003 -sTCP:LISTEN | xargs -r kill -9 || true
lsof -ti:8004 -sTCP:LISTEN | xargs -r kill -9 || true
sleep 0.5

echo "Stopped."