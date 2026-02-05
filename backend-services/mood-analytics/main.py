"""
SoulBuddy Mood Analytics Service
Mood tracking, logging, and pattern analysis
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from collections import defaultdict
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="SoulBuddy Mood Analytics Service",
    description="Mood tracking and analytics microservice",
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

# Pydantic Models
class MoodEntry(BaseModel):
    user_id: int
    mood_level: int  # 1-5 scale
    mood_type: str  # happy, sad, anxious, angry, neutral
    notes: Optional[str] = None
    activities: Optional[List[str]] = []  # sleep, exercise, social, work
    
class MoodResponse(BaseModel):
    id: int
    user_id: int
    mood_level: int
    mood_type: str
    notes: Optional[str]
    activities: List[str]
    timestamp: datetime

class MoodAnalytics(BaseModel):
    user_id: int
    total_entries: int
    average_mood: float
    most_common_mood: str
    mood_distribution: Dict[str, int]
    recent_trend: str  # improving, declining, stable

class MoodTrend(BaseModel):
    date: str
    average_mood: float
    entry_count: int

# In-memory storage (Replace with database in production)
mood_entries = {}
entry_id_counter = 1

# Helper Functions
def calculate_analytics(user_id: int) -> Dict:
    """Calculate mood analytics for a user"""
    user_moods = [entry for entry in mood_entries.values() if entry["user_id"] == user_id]
    
    if not user_moods:
        return None
    
    # Calculate statistics
    total = len(user_moods)
    avg_mood = sum(m["mood_level"] for m in user_moods) / total
    
    # Mood distribution
    mood_dist = defaultdict(int)
    for mood in user_moods:
        mood_dist[mood["mood_type"]] += 1
    
    most_common = max(mood_dist.items(), key=lambda x: x[1])[0] if mood_dist else "neutral"
    
    # Recent trend (last 7 days vs previous 7 days)
    now = datetime.utcnow()
    last_week = [m for m in user_moods if (now - m["timestamp"]).days <= 7]
    prev_week = [m for m in user_moods if 7 < (now - m["timestamp"]).days <= 14]
    
    if last_week and prev_week:
        last_avg = sum(m["mood_level"] for m in last_week) / len(last_week)
        prev_avg = sum(m["mood_level"] for m in prev_week) / len(prev_week)
        
        if last_avg > prev_avg + 0.3:
            trend = "improving"
        elif last_avg < prev_avg - 0.3:
            trend = "declining"
        else:
            trend = "stable"
    else:
        trend = "insufficient_data"
    
    return {
        "total_entries": total,
        "average_mood": round(avg_mood, 2),
        "most_common_mood": most_common,
        "mood_distribution": dict(mood_dist),
        "recent_trend": trend
    }

def get_trends(user_id: int, days: int = 30) -> List[Dict]:
    """Get daily mood trends"""
    user_moods = [entry for entry in mood_entries.values() if entry["user_id"] == user_id]
    
    # Group by date
    daily_moods = defaultdict(list)
    for mood in user_moods:
        date_str = mood["timestamp"].strftime("%Y-%m-%d")
        daily_moods[date_str].append(mood["mood_level"])
    
    # Calculate daily averages
    trends = []
    for date_str, levels in sorted(daily_moods.items())[-days:]:
        trends.append({
            "date": date_str,
            "average_mood": round(sum(levels) / len(levels), 2),
            "entry_count": len(levels)
        })
    
    return trends

# API Endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "SoulBuddy Mood Analytics Service",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.post("/api/mood/log", response_model=MoodResponse, status_code=status.HTTP_201_CREATED)
async def log_mood(mood: MoodEntry):
    """Log a new mood entry"""
    global entry_id_counter
    
    new_entry = {
        "id": entry_id_counter,
        "user_id": mood.user_id,
        "mood_level": mood.mood_level,
        "mood_type": mood.mood_type,
        "notes": mood.notes,
        "activities": mood.activities or [],
        "timestamp": datetime.utcnow()
    }
    
    mood_entries[entry_id_counter] = new_entry
    entry_id_counter += 1
    
    return MoodResponse(**new_entry)

@app.get("/api/mood/{user_id}")
async def get_mood_history(user_id: int, limit: int = 50):
    """Get mood history for a user"""
    user_moods = [
        MoodResponse(**entry)
        for entry in mood_entries.values()
        if entry["user_id"] == user_id
    ]
    
    # Sort by timestamp (newest first)
    user_moods.sort(key=lambda x: x.timestamp, reverse=True)
    
    return {
        "user_id": user_id,
        "total_entries": len(user_moods),
        "moods": user_moods[:limit]
    }

@app.get("/api/mood/analytics/{user_id}", response_model=MoodAnalytics)
async def get_analytics(user_id: int):
    """Get mood analytics for a user"""
    analytics = calculate_analytics(user_id)
    
    if not analytics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No mood data found for this user"
        )
    
    return MoodAnalytics(
        user_id=user_id,
        **analytics
    )

@app.get("/api/mood/trends/{user_id}")
async def get_mood_trends(user_id: int, days: int = 30):
    """Get mood trends over time"""
    trends = get_trends(user_id, days)
    
    if not trends:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No mood data found for this user"
        )
    
    return {
        "user_id": user_id,
        "period_days": days,
        "trends": trends
    }

@app.get("/api/mood/report/{user_id}")
async def generate_report(user_id: int):
    """Generate comprehensive mood report"""
    analytics = calculate_analytics(user_id)
    trends = get_trends(user_id, days=30)
    
    if not analytics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No mood data found for this user"
        )
    
    # Activity analysis
    user_moods = [entry for entry in mood_entries.values() if entry["user_id"] == user_id]
    activity_count = defaultdict(int)
    for mood in user_moods:
        for activity in mood["activities"]:
            activity_count[activity] += 1
    
    return {
        "user_id": user_id,
        "report_date": datetime.utcnow().strftime("%Y-%m-%d"),
        "analytics": analytics,
        "trends": trends,
        "top_activities": dict(sorted(activity_count.items(), key=lambda x: x[1], reverse=True)[:5]),
        "recommendations": [
            "Continue tracking your mood regularly",
            "Notice patterns between activities and mood",
            "Consider professional support if mood consistently low"
        ]
    }

@app.delete("/api/mood/{entry_id}")
async def delete_mood_entry(entry_id: int):
    """Delete a mood entry"""
    if entry_id not in mood_entries:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mood entry not found"
        )
    
    del mood_entries[entry_id]
    return {"message": "Mood entry deleted successfully"}

@app.get("/api/mood/latest/{user_id}")
async def get_latest_mood(user_id: int):
    """Get the most recent mood entry for a user"""
    user_moods = [
        entry for entry in mood_entries.values()
        if entry["user_id"] == user_id
    ]
    
    if not user_moods:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No mood entries found"
        )
    
    latest = max(user_moods, key=lambda x: x["timestamp"])
    return MoodResponse(**latest)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
