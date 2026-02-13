#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/thenulahansaja/Documents/SOULBUDDY"
VENV_PY="$ROOT/venv/bin/python"
DEEPFACE_PY="$ROOT/deepface-env/bin/python"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

echo "Stopping any existing services on ports 8002 and 8004..."
lsof -ti:8002 -sTCP:LISTEN | xargs -r kill -9 || true
lsof -ti:8004 -sTCP:LISTEN | xargs -r kill -9 || true
sleep 1

# Start User service (port 8004)
echo "Starting User service (8004) -> logs/user-service.log"
nohup "$VENV_PY" "$ROOT/backend-services/user-service/main.py" > "$LOG_DIR/user-service.log" 2>&1 &
PID_USER=$!
sleep 0.5

# Start Chat AI service (8002) - uses deepface-env
echo "Starting Chat AI service (8002) -> logs/chat-ai-service.log"
nohup "$DEEPFACE_PY" "$ROOT/backend-services/chat-ai-service/main.py" > "$LOG_DIR/chat-ai-service.log" 2>&1 &
PID_CHAT=$!

# Start Lifestyle service (8005)
echo "Starting Lifestyle service (8005) -> logs/lifestyle-service.log"
nohup "$VENV_PY" "$ROOT/backend-services/lifestyle-service/main.py" > "$LOG_DIR/lifestyle-service.log" 2>&1 &
PID_LIFESTYLE=$!

sleep 1

echo "Started (PIDs): user=$PID_USER chat=$PID_CHAT lifestyle=$PID_LIFESTYLE"

echo "Tailing logs (first 10 lines each)..."
for f in user-service chat-ai-service lifestyle-service; do
  echo "---- $f ----"
  head -n 10 "$LOG_DIR/${f}.log" || true
done

echo "All services started. To view live logs run: ./scripts/logs-services.sh"