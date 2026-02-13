"""
Database models
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON, ForeignKey
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    # store hobbies as JSON array so we can send/receive `list[str]` from API
    hobbies = Column(JSON)
    family_members = Column(Integer, default=0)
    ambitions = Column(JSON)  # Array of strings
    job_title = Column(String)
    top_company = Column(String)
    pet_name = Column(String)
    skills = Column(JSON)  # Array of strings
    age = Column(Integer)
    weight = Column(Integer)
    is_student = Column(Boolean, default=False)
    is_married = Column(Boolean, default=False)
    relationship_status = Column(String, default="single")
    health_conditions = Column(JSON)  # Array of strings
    favorite_songs = Column(JSON)  # Array of strings
    province = Column(String)
    city = Column(String)
    village = Column(String)
    profile_photo_url = Column(String)
    sleep_latency = Column(Integer)
    exercise_time = Column(String)
    lifestyle = Column(JSON)  # Object with sleep, exercise, diet
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
