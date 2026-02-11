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

class UserProfileBase(BaseModel):
    hobbies: Optional[str] = None
    family_members: Optional[int] = 0
    ambitions: Optional[List[str]] = []
    job_title: Optional[str] = None
    is_student: Optional[bool] = False
    is_married: Optional[bool] = False
    relationship_status: Optional[str] = "single"
    health_conditions: Optional[List[str]] = []
    favorite_songs: Optional[List[str]] = []
    province: Optional[str] = None
    village: Optional[str] = None
    profile_photo_url: Optional[str] = None
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
