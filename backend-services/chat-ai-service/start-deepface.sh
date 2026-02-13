#!/bin/bash
# 🚀 Start Chat AI Service with DeepFace (Python 3.11)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
DEEPFACE_ENV="$PROJECT_ROOT/deepface-env"
SERVICE_DIR="$PROJECT_ROOT/backend-services/chat-ai-service"

echo "🎭 Starting SoulBuddy Chat AI Service with DeepFace..."
echo "📁 Project Root: $PROJECT_ROOT"
echo "🐍 Python Env: $DEEPFACE_ENV"
echo "📂 Service Dir: $SERVICE_DIR"

# Check if deepface environment exists
if [ ! -d "$DEEPFACE_ENV" ]; then
    echo "❌ DeepFace environment not found at $DEEPFACE_ENV"
    echo "Please run: python3.11 -m venv deepface-env"
    exit 1
fi

# Kill existing service
echo "🛑 Stopping existing service..."
pkill -f "chat-ai-service/main.py"
sleep 2

# Start service with deepface environment
echo "✅ Starting service on port 8002..."
cd "$SERVICE_DIR"
source "$DEEPFACE_ENV/bin/activate"
python main.py > /tmp/chat-service.log 2>&1 &

sleep 3

# Check if service started
if curl -s http://localhost:8002/health > /dev/null; then
    echo "✅ Service started successfully!"
    echo "📊 Health check: http://localhost:8002/health"
    echo "📋 Logs: tail -f /tmp/chat-service.log"
else
    echo "❌ Service failed to start. Check logs:"
    tail -20 /tmp/chat-service.log
    exit 1
fi
