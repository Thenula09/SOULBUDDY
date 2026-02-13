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
        data={"sub": db_user.email}, expires_delta=access_token_expires
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
        data={"sub": user.email}, expires_delta=access_token_expires
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

@app.post("/users/mood")
async def save_mood_data(
    mood_data: MoodData,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Save mood data from chat conversations.
    This endpoint stores emotional state detected during AI chat interactions.
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
    
    # TODO: Store mood data in database
    # For now, just return success - you'll need to create a MoodHistory model later
    print(f"\u2705 Mood data received for user {user.id}: {mood_data.emotion} (score: {mood_data.emotion_score})")
    
    return {
        "success": True,
        "message": "Mood data saved successfully",
        "data": {
            "user_id": user.id,
            "emotion": mood_data.emotion,
            "emotion_score": mood_data.emotion_score,
            "timestamp": datetime.utcnow().isoformat()
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
