"""
Database configuration and connection
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Convert postgresql:// to postgresql+psycopg:// for better compatibility  
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# Create engine with error handling
try:
    engine = create_engine(
        DATABASE_URL, 
        pool_pre_ping=True,
        connect_args={"connect_timeout": 10}
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
except Exception as e:
    print(f"⚠️  Database connection warning: {e}")
    print("💡 Please update your Supabase password in .env file")
    # Create a fallback for development
    engine = None
    SessionLocal = None

Base = declarative_base()

def get_db():
    """Dependency for getting database session"""
    if SessionLocal is None:
        raise Exception("Database not configured. Please check your DATABASE_URL in .env file")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
