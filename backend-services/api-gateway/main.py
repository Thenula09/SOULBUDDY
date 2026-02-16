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
LIFESTYLE_SERVICE_URL = os.getenv("LIFESTYLE_SERVICE_URL", "http://localhost:8005")

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
    
    # Allow unauthenticated access to lifestyle endpoints during local development
    # (gateway will forward these requests to the lifestyle service on :8005)
    if request.url.path in public_paths or request.url.path.startswith("/docs") or request.url.path.startswith("/openapi") or request.url.path.startswith("/api/lifestyle"):
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
            "lifestyle_service": LIFESTYLE_SERVICE_URL
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
            ("lifestyle_service", LIFESTYLE_SERVICE_URL)
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

# Lifestyle Service Routes
@app.post("/api/lifestyle/log")
async def log_lifestyle(request: Request):
    body = await request.json()
    return await forward_request(
        f"{LIFESTYLE_SERVICE_URL}/api/lifestyle/log",
        "POST",
        dict(request.headers),
        body
    )

@app.get("/api/lifestyle/{user_id}")
async def get_lifestyle(user_id: int, request: Request):
    return await forward_request(
        f"{LIFESTYLE_SERVICE_URL}/api/lifestyle/{user_id}",
        "GET",
        dict(request.headers)
    )

@app.get("/api/lifestyle/moods/today/{user_id}")
async def get_lifestyle_moods_today(user_id: int, request: Request):
    return await forward_request(
        f"{LIFESTYLE_SERVICE_URL}/api/lifestyle/moods/today/{user_id}",
        "GET",
        dict(request.headers)
    )

@app.get("/api/lifestyle/moods/last/{user_id}")
async def get_lifestyle_moods_last(user_id: int, request: Request):
    qs = str(request.query_params)
    url = f"{LIFESTYLE_SERVICE_URL}/api/lifestyle/moods/last/{user_id}"
    if qs:
        url = url + "?" + qs
    return await forward_request(
        url,
        "GET",
        dict(request.headers)
    )

@app.get("/api/lifestyle/week/{user_id}")
async def get_lifestyle_week(user_id: int, request: Request):
    return await forward_request(
        f"{LIFESTYLE_SERVICE_URL}/api/lifestyle/week/{user_id}",
        "GET",
        dict(request.headers)
    )

# Forward combined charts (used by mobile `LifestyleScreen`)
@app.get("/api/lifestyle/moods/combined-charts/{user_id}")
async def get_lifestyle_combined_charts(user_id: int, request: Request):
    return await forward_request(
        f"{LIFESTYLE_SERVICE_URL}/api/lifestyle/moods/combined-charts/{user_id}",
        "GET",
        dict(request.headers)
    )

# Demo charts proxy (mobile fallback)
@app.get("/api/demo/combined-charts/{user_id}")
async def get_demo_combined_charts(user_id: int, request: Request):
    return await forward_request(
        f"{LIFESTYLE_SERVICE_URL}/api/demo/combined-charts/{user_id}",
        "GET",
        dict(request.headers)
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
