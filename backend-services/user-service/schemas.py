"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List, Dict, Any

class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None

class MoodData(BaseModel):
    emotion: str  # Happy, Sad, Angry, Stress, Neutral, Anxious, Excited
    emotion_score: Optional[int] = 5  # 1-10 scale
    chat_message_id: Optional[str] = None
    notes: Optional[str] = None
    lifestyle: Optional[Dict[str, Any]] = {}

class UserProfileBase(BaseModel):
    # Changed to a list so frontend can send `hobbies: ["Music","Gardening"]` directly
    hobbies: Optional[List[str]] = None
    family_members: Optional[int] = 0
    ambitions: Optional[List[str]] = []
    job_title: Optional[str] = None
    top_company: Optional[str] = None
    pet_name: Optional[str] = None
    skills: Optional[List[str]] = []
    age: Optional[int] = None
    weight: Optional[float] = None
    is_student: Optional[bool] = False
    is_married: Optional[bool] = False
    relationship_status: Optional[str] = "single"
    health_conditions: Optional[List[str]] = []
    favorite_songs: Optional[List[str]] = []
    province: Optional[str] = None
    city: Optional[str] = None
    village: Optional[str] = None
    profile_photo_url: Optional[str] = None
    sleep_latency: Optional[int] = None
    exercise_time: Optional[str] = None
    lifestyle: Optional[Dict[str, Any]] = None

class UserProfileCreate(UserProfileBase):
    pass

class UserProfileUpdate(UserProfileBase):
    pass

class UserProfileResponse(UserProfileBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
