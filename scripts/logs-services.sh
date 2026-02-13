#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="/Users/thenulahansaja/Documents/SOULBUDDY/logs"
mkdir -p "$LOG_DIR"

# Show live logs for all three services in one combined stream
# Press Ctrl-C to stop following

echo "Tailing logs: $LOG_DIR/*-service.log"
tail -n +1 -F "$LOG_DIR/user-service.log" "$LOG_DIR/chat-ai-service.log" "$LOG_DIR/lifestyle-service.log"