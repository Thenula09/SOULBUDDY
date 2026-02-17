"""
SoulBuddy User Service - User authentication and management
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import time

from database import engine, get_db, Base
from models import User, UserProfile
from schemas import UserCreate, UserLogin, UserResponse, Token, UserProfileCreate, UserProfileUpdate, UserProfileResponse, MoodData
from auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# Create database tables (with error handling)
try:
    if engine is not None:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully!")
    else:
        print("⚠️  Running without database connection")
        print("💡 Update your Supabase password in .env file and restart")
except Exception as e:
    print(f"⚠️  Database initialization warning: {e}")
    print("💡 Service will run but database operations will fail")

import os
import uuid
from fastapi import File, UploadFile
from fastapi.staticfiles import StaticFiles

# Create uploads directory if not exists
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="SoulBuddy User Service", version="1.0.0")

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Optional Supabase integration for mood persistence
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

import requests

def _supabase_headers():
    return {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"} if SUPABASE_KEY else {}

# Dependency to get current user from token
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user

@app.get("/")
async def root():
    return {"service": "SoulBuddy User Service", "version": "1.0.0", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/api/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if email already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email, "user_id": db_user.id, "email": db_user.email},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

@app.post("/api/auth/login", response_model=Token)
async def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT token"""
    # Find user by email
    user = db.query(User).filter(User.email == user_credentials.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Verify password
    if not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id, "email": user.email},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

# Simple in-memory profile cache to reduce repeated DB hits
PROFILE_CACHE: dict = {}
CACHE_TTL_SECONDS = 30

# In-memory mood store for local/dev (user_id -> list of mood records)
MOOD_STORE: dict = {}

def _get_cached_user(user_id: int):
    item = PROFILE_CACHE.get(user_id)
    if not item:
        return None
    ts, data = item
    if (time.time() - ts) > CACHE_TTL_SECONDS:
        PROFILE_CACHE.pop(user_id, None)
        return None
    return data

def _set_cached_user(user_id: int, data):
    PROFILE_CACHE[user_id] = (time.time(), data)


def _get_today_moods_for_user(user_id: int):
    """Return in-memory moods for the given user for the current UTC day."""
    items = MOOD_STORE.get(user_id, [])
    today = datetime.utcnow().date()
    filtered = []
    for m in items:
        try:
            ts = datetime.fromisoformat(m.get("timestamp"))
            if ts.date() == today:
                filtered.append(m)
        except Exception:
            # if timestamp missing or bad format, include it
            filtered.append(m)
    return filtered

@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user by ID with basic caching and timing logs"""
    # Check cache first
    cached = _get_cached_user(user_id)
    if cached:
        return cached

    start = time.time()
    user = db.query(User).filter(User.id == user_id).first()
    elapsed = (time.time() - start) * 1000
    if user:
        _set_cached_user(user_id, user)
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    print(f"DB query for user {user_id} took {elapsed:.2f} ms")
    return user

# --- Profile endpoints (re-added) ---
@app.get("/api/profile/me", response_model=UserProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile (with cache)"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        # Return an empty profile object instead of 404 so clients can safely consume a profile shape
        user = db.query(User).filter(User.id == current_user.id).first()
        return {
            "id": 0,
            "user_id": current_user.id,
            "hobbies": None,
            "family_members": 0,
            "ambitions": [],
            "job_title": "",
            "top_company": "",
            "pet_name": "",
            "skills": [],
            "age": None,
            "weight": None,
            "is_student": False,
            "is_married": False,
            "relationship_status": "single",
            "health_conditions": [],
            "favorite_songs": [],
            "province": "",
            "city": "",
            "village": "",
            "profile_photo_url": None,
            "sleep_latency": None,
            "exercise_time": "",
            "lifestyle": {"sleep": 7, "exercise": 30, "diet": "good"},
            "created_at": datetime.utcnow(),
            "updated_at": None
        }
    return profile

@app.post("/api/profile/me", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_profile(
    profile_data: UserProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update current user's profile"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if profile:
        for key, value in profile_data.model_dump(exclude_unset=True).items():
            setattr(profile, key, value)
    else:
        profile = UserProfile(user_id=current_user.id, **profile_data.model_dump())
        db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@app.post("/api/profile/me/upload-photo")
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a profile photo and update the user's profile_photo_url"""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file provided")
    filename = f"{uuid.uuid4().hex}_{os.path.basename(file.filename)}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    try:
        with open(file_path, 'wb') as f:
            contents = await file.read()
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    public_url = f"/uploads/{filename}"
    if profile:
        profile.profile_photo_url = public_url
    else:
        profile = UserProfile(user_id=current_user.id, profile_photo_url=public_url)
        db.add(profile)
    db.commit()
    db.refresh(profile)

    return {"url": public_url}

@app.put("/api/profile/me", response_model=UserProfileResponse)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Please create a profile first."
        )
    for key, value in profile_data.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile

@app.put("/api/profile/{user_id}", response_model=UserProfileResponse)
async def update_user_profile(
    user_id: int,
    profile_data: UserProfileUpdate,
    db: Session = Depends(get_db)
):
    """Update user profile by user ID (for mobile app compatibility)"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        # Create new profile if it doesn't exist
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        profile = UserProfile(user_id=user_id)
        db.add(profile)
    
    # Update profile fields
    for key, value in profile_data.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    
    db.commit()
    db.refresh(profile)
    return profile

@app.get("/api/profile/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get user profile by user ID"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        # Return an empty profile object instead of 404 so clients can display prefill data
        user = db.query(User).filter(User.id == user_id).first()
        return {
            "id": 0,
            "user_id": user_id,
            "hobbies": None,
            "family_members": 0,
            "ambitions": [],
            "job_title": "",
            "top_company": "",
            "pet_name": "",
            "skills": [],
            "age": None,
            "weight": None,
            "is_student": False,
            "is_married": False,
            "relationship_status": "single",
            "health_conditions": [],
            "favorite_songs": [],
            "province": "",
            "city": "",
            "village": "",
            "profile_photo_url": None,
            "sleep_latency": None,
            "exercise_time": "",
            "lifestyle": {"sleep": 7, "exercise": 30, "diet": "good"},
            "created_at": datetime.utcnow(),
            "updated_at": None
        }
    return profile


# Backward-compatible public route used by mobile frontend (some clients call /users/profile/:id)
@app.get('/users/profile/{user_id}')
async def users_profile_compat(user_id: str, db: Session = Depends(get_db)):
    """Compatibility wrapper that returns the same payload as /api/profile/{user_id}.
    Accepts either numeric ID or UUID string and maps to integer user_id when possible."""
    # try to coerce numeric id first
    try:
        uid_int = int(user_id)
        return await get_user_profile(uid_int, db)
    except Exception:
        # attempt to find user by uuid or fallback to 404-like empty profile
        user = db.query(User).filter((User.id == user_id) | (User.email == user_id) | (User.username == user_id)).first()
        if user:
            return await get_user_profile(user.id, db)
        # Fallback: return empty profile shape for frontend
        return {
            "id": 0,
            "user_id": 0,
            "hobbies": None,
            "family_members": 0,
            "ambitions": [],
            "job_title": "",
            "top_company": "",
            "pet_name": "",
            "skills": [],
            "age": None,
            "weight": None,
            "is_student": False,
            "is_married": False,
            "relationship_status": "single",
            "health_conditions": [],
            "favorite_songs": [],
            "province": "",
            "city": "",
            "village": "",
            "profile_photo_url": None,
            "sleep_latency": None,
            "exercise_time": "",
            "lifestyle": {"sleep": 7, "exercise": 30, "diet": "good"},
            "created_at": datetime.utcnow(),
            "updated_at": None
        }

@app.post("/users/mood")
async def save_mood_data(
    mood_data: MoodData,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Save mood data from chat conversations.
    - Stores the record in an in-memory store for local/dev testing
    - Returns the saved record
    """
    # Verify token and get user
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    email = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    # Get user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Build mood record (local representation)
    record = {
        "emotion": mood_data.emotion,
        "emotion_score": mood_data.emotion_score or 5,
        "chat_message_id": mood_data.chat_message_id,
        "notes": mood_data.notes,
        "lifestyle": mood_data.lifestyle or {},
        "timestamp": datetime.utcnow().isoformat()
    }

    saved_to_supabase = False

    # If Supabase configured, persist to `mood_history` table there as canonical storage
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            payload = {
                "user_id": user.id,
                "emotion": record["emotion"],
                # map 1-10 score -> 0.0-1.0 confidence
                "confidence": float((record.get("emotion_score") or 5) / 10.0),
                "source": "chat",
                "created_at": datetime.utcnow().isoformat()
            }
            headers = _supabase_headers()
            headers.update({"Content-Type": "application/json", "Prefer": "return=representation"})
            resp = requests.post(f"{SUPABASE_URL}/rest/v1/mood_history", headers=headers, json=payload, timeout=5)
            if resp.status_code in (200, 201):
                saved_to_supabase = True
                print(f"✅ Mood saved to Supabase for user {user.id}: {payload}")
            else:
                print(f"⚠️ Supabase mood insert failed: {resp.status_code} - {resp.text}")
        except Exception as e:
            print(f"❌ Supabase mood insert error: {e}")

    # Always keep in-memory store for local/dev fallback and fast reads
    MOOD_STORE.setdefault(user.id, []).append(record)

    print(f"\u2705 Mood data received for user {user.id}: {record['emotion']} (score: {record['emotion_score']}) (supabase={saved_to_supabase})")
    
    return {
        "success": True,
        "message": "Mood data saved successfully",
        "data": {
            "user_id": user.id,
            "supabase_saved": saved_to_supabase,
            **record
        }
    }


@app.get("/users/mood/today")
async def get_today_moods(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Return today's mood entries for the authenticated user (in-memory fallback)."""
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # If Supabase configured, read today's moods from `mood_history` first
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            headers = _supabase_headers()
            params = {
                "user_id": f"eq.{user.id}",
                "created_at": f"gte.{datetime.utcnow().date().isoformat()}",
                "order": "created_at.asc"
            }
            resp = requests.get(f"{SUPABASE_URL}/rest/v1/mood_history", headers=headers, params=params, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                # Normalize to frontend shape
                items = [
                    {
                        "emotion": d.get("emotion"),
                        "emotion_score": int((d.get("confidence") or 0) * 10),
                        "timestamp": d.get("created_at"),
                        "source": d.get("source")
                    }
                    for d in data
                ]
                return items
            else:
                print(f"⚠️ Supabase read failed: {resp.status_code} - {resp.text}")
        except Exception as e:
            print(f"❌ Error querying Supabase for today moods: {e}")

    # Fallback to in-memory store for local/dev
    items = _get_today_moods_for_user(user.id)
    # Return as an array to match frontend expectations
    return items


@app.get("/users/mood/analytics/today")
async def get_mood_analytics_today(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Return simple analytics (counts per emotion) for today's moods (in-memory)."""
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    items = _get_today_moods_for_user(user.id)
    counts: dict = {}
    for m in items:
        emo = m.get("emotion") or "Unknown"
        counts[emo] = counts.get(emo, 0) + 1

    return {"user_id": user.id, "total": len(items), "counts": counts}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
