"""
SoulBuddy API Gateway
Central routing and authentication gateway for all microservices
"""

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import os
from dotenv import load_dotenv
from typing import Optional
import jwt
from datetime import datetime

load_dotenv()

app = FastAPI(
    title="SoulBuddy API Gateway",
    description="Central API Gateway for SoulBuddy microservices",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service URLs
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://localhost:8004")
CHAT_SERVICE_URL = os.getenv("CHAT_SERVICE_URL", "http://localhost:8002")
MOOD_SERVICE_URL = os.getenv("MOOD_SERVICE_URL", "http://localhost:8003")

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")

# Helper Functions
def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

async def forward_request(url: str, method: str, headers: dict, body: Optional[dict] = None):
    """Forward request to microservice"""
    async with httpx.AsyncClient() as client:
        try:
            if method == "GET":
                response = await client.get(url, headers=headers, timeout=10.0)
            elif method == "POST":
                response = await client.post(url, headers=headers, json=body, timeout=10.0)
            elif method == "PUT":
                response = await client.put(url, headers=headers, json=body, timeout=10.0)
            elif method == "DELETE":
                response = await client.delete(url, headers=headers, timeout=10.0)
            else:
                raise HTTPException(status_code=405, detail="Method not allowed")
            
            return JSONResponse(
                content=response.json() if response.text else {},
                status_code=response.status_code
            )
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Service timeout")
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Service unavailable")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

# Middleware for authentication
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """Authentication middleware"""
    # Public endpoints (no auth required)
    public_paths = [
        "/",
        "/health",
        "/api/auth/register",
        "/api/auth/login",
        "/docs",
        "/redoc",
        "/openapi.json"
    ]
    
    if request.url.path in public_paths or request.url.path.startswith("/docs") or request.url.path.startswith("/openapi"):
        return await call_next(request)
    
    # Check for authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Missing or invalid authorization header"}
        )
    
    token = auth_header.split(" ")[1]
    payload = verify_token(token)
    
    if not payload:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Invalid or expired token"}
        )
    
    # Add user info to request state
    request.state.user_id = payload.get("user_id")
    request.state.email = payload.get("email")
    
    return await call_next(request)

# Root Endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "SoulBuddy API Gateway",
        "version": "1.0.0",
        "status": "running",
        "services": {
            "user_service": USER_SERVICE_URL,
            "chat_service": CHAT_SERVICE_URL,
            "mood_service": MOOD_SERVICE_URL
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    services_status = {}
    
    # Check each service
    async with httpx.AsyncClient() as client:
        for name, url in [
            ("user_service", USER_SERVICE_URL),
            ("chat_service", CHAT_SERVICE_URL),
            ("mood_service", MOOD_SERVICE_URL)
        ]:
            try:
                response = await client.get(f"{url}/health", timeout=5.0)
                services_status[name] = "healthy" if response.status_code == 200 else "unhealthy"
            except:
                services_status[name] = "unreachable"
    
    return {
        "gateway": "healthy",
        "services": services_status,
        "timestamp": datetime.utcnow().isoformat()
    }

# User Service Routes
@app.post("/api/auth/register")
async def register(request: Request):
    """Forward registration to user service"""
    body = await request.json()
    return await forward_request(
        f"{USER_SERVICE_URL}/api/auth/register",
        "POST",
        dict(request.headers),
        body
    )

@app.post("/api/auth/login")
async def login(request: Request):
    """Forward login to user service"""
    body = await request.json()
    return await forward_request(
        f"{USER_SERVICE_URL}/api/auth/login",
        "POST",
        dict(request.headers),
        body
    )

@app.get("/api/users/{user_id}")
async def get_user(user_id: int, request: Request):
    """Forward get user to user service"""
    return await forward_request(
        f"{USER_SERVICE_URL}/api/users/{user_id}",
        "GET",
        dict(request.headers)
    )

# Chat Service Routes
@app.post("/api/chat/message")
async def send_chat_message(request: Request):
    """Forward chat message to chat service"""
    body = await request.json()
    return await forward_request(
        f"{CHAT_SERVICE_URL}/api/chat/message",
        "POST",
        dict(request.headers),
        body
    )

@app.get("/api/chat/history/{user_id}")
async def get_chat_history(user_id: int, request: Request):
    """Forward get chat history to chat service"""
    return await forward_request(
        f"{CHAT_SERVICE_URL}/api/chat/history/{user_id}",
        "GET",
        dict(request.headers)
    )

# Mood Service Routes
@app.post("/api/mood/log")
async def log_mood(request: Request):
    """Forward mood log to mood service"""
    body = await request.json()
    return await forward_request(
        f"{MOOD_SERVICE_URL}/api/mood/log",
        "POST",
        dict(request.headers),
        body
    )

@app.get("/api/mood/{user_id}")
async def get_mood_history(user_id: int, request: Request):
    """Forward get mood history to mood service"""
    return await forward_request(
        f"{MOOD_SERVICE_URL}/api/mood/{user_id}",
        "GET",
        dict(request.headers)
    )

@app.get("/api/mood/analytics/{user_id}")
async def get_mood_analytics(user_id: int, request: Request):
    """Forward get analytics to mood service"""
    return await forward_request(
        f"{MOOD_SERVICE_URL}/api/mood/analytics/{user_id}",
        "GET",
        dict(request.headers)
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
