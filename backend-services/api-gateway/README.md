# 🚪 SoulBuddy API Gateway

Central API Gateway for routing and authentication across all SoulBuddy microservices.

## 🎯 Purpose

Single entry point for all client requests with authentication, routing, and load balancing.

## 🚀 Features

- ✅ Centralized request routing
- ✅ JWT authentication middleware
- ✅ Service health monitoring
- ✅ Request/response forwarding
- ✅ CORS configuration
- ✅ Error handling and retries
- ✅ Service discovery
- ✅ Automatic API documentation

## 🛠️ Tech Stack

- **Python** 3.9+
- **FastAPI** - Web framework
- **httpx** - HTTP client for forwarding
- **JWT** - Authentication
- **Uvicorn** - ASGI server

## 📦 Installation

### 1. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
# Configure service URLs in .env
```

### 4. Run Service

```bash
python main.py
```

Gateway will start on **http://localhost:8000**

## 📝 Architecture

```
┌─────────────┐
│ Mobile App  │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ API Gateway │ ← Single Entry Point
│   :8000     │
└──────┬──────┘
       │
   ┌───┼────┬─────────┐
   ↓   ↓    ↓         ↓
┌────┐┌───┐┌────┐┌────┐
│User││Chat││Mood││... │
│Svc ││Svc││Svc ││    │
└────┘└───┘└────┘└────┘
```

## 🛣️ Routing

### Public Routes (No Auth)
```
GET  /                    - Root endpoint
GET  /health              - Health check
POST /api/auth/register   - User registration
POST /api/auth/login      - User login
```

### Protected Routes (Auth Required)
```
# User Service
GET    /api/users/{user_id}

# Chat Service
POST   /api/chat/message
GET    /api/chat/history/{user_id}

# Mood Service
POST   /api/mood/log
GET    /api/mood/{user_id}
GET    /api/mood/analytics/{user_id}
```

## 🔒 Authentication

### How It Works
1. Client includes JWT token in header:
   ```
   Authorization: Bearer <token>
   ```
2. Gateway validates token
3. If valid, forwards request to service
4. If invalid, returns 401 Unauthorized

### Public Endpoints
These don't require authentication:
- `/` - Root
- `/health` - Health check
- `/api/auth/*` - Auth endpoints
- `/docs` - Swagger docs

## 📖 API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🧪 Testing

### Health Check
```bash
curl -X GET "http://localhost:8000/health"
```

### Register (via Gateway)
```bash
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123",
    "full_name": "John Doe"
  }'
```

### Login (via Gateway)
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123"
  }'
```

### Protected Request
```bash
curl -X POST "http://localhost:8000/api/mood/log" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "mood_level": 4,
    "mood_type": "happy"
  }'
```

## ⚙️ Configuration

### Service URLs
Configure in `.env`:
```bash
USER_SERVICE_URL=http://localhost:8004
CHAT_SERVICE_URL=http://localhost:8002
MOOD_SERVICE_URL=http://localhost:8003
```

### For Docker
```bash
USER_SERVICE_URL=http://user-service:8004
CHAT_SERVICE_URL=http://chat-service:8002
MOOD_SERVICE_URL=http://mood-service:8003
```

## 🔄 Request Flow

1. **Client** → Sends request to Gateway
2. **Gateway** → Validates JWT token (if protected)
3. **Gateway** → Forwards to appropriate service
4. **Service** → Processes request
5. **Service** → Returns response
6. **Gateway** → Forwards response to client

## 🚦 Error Handling

| Error Code | Description |
|------------|-------------|
| 401 | Unauthorized (invalid/expired token) |
| 403 | Forbidden |
| 404 | Not found |
| 500 | Internal server error |
| 503 | Service unavailable |
| 504 | Gateway timeout |

## 📊 Health Monitoring

Health endpoint checks all services:
```json
{
  "gateway": "healthy",
  "services": {
    "user_service": "healthy",
    "chat_service": "healthy",
    "mood_service": "unreachable"
  },
  "timestamp": "2026-02-06T10:30:00"
}
```

## 🔄 Integration

### Prerequisites
All backend services must be running:
```bash
# Terminal 1
cd backend-services/user-service && python main.py

# Terminal 2
cd backend-services/chat-ai-service && python main.py

# Terminal 3
cd backend-services/mood-analytics && python main.py

# Terminal 4
cd backend-services/api-gateway && python main.py
```

### Mobile App Configuration
Point mobile app to gateway:
```typescript
const API_BASE_URL = 'http://localhost:8000';
```

## 🚢 Deployment

### Docker Compose
```yaml
version: '3.8'
services:
  api-gateway:
    build: ./api-gateway
    ports:
      - "8000:8000"
    depends_on:
      - user-service
      - chat-service
      - mood-service
```

### Environment Variables
Ensure all service URLs are correctly configured for production.

## 📞 Support

For issues, contact the SoulBuddy development team.

---

**Part of SoulBuddy Platform** | [Main Repository](https://github.com/Thenula09/SOULBUDDY)
