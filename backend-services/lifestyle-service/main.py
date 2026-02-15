"""
Simple Lifestyle Service (prototype)
- FastAPI app that stores lightweight lifestyle entries in-memory
- Endpoints:
  - GET  /health
  - POST /api/lifestyle/log         -> log an entry
  - GET  /api/lifestyle/{user_id}   -> return all entries for user
  - GET  /api/lifestyle/week/{user_id} -> aggregated mock weekly data

This is intentionally small and in-memory for quick local development.
"""
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
import uvicorn
import os
import requests
import jwt
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Enhanced Lifestyle Service", version="1.0.0")

# In-memory store for manual entries: { user_id: [entries...] }
_STORE: Dict[int, List[Dict[str, Any]]] = {}

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://localhost:8004")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# JWT Secret
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")

def _supabase_headers():
    return {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"} if SUPABASE_KEY else {}

def verify_token(authorization: Optional[str] = None):
    """Verify JWT token and extract user_id"""
    if not authorization:
        return None
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("user_id")
    except:
        return None

class LifestyleEntry(BaseModel):
    user_id: int
    ts: Optional[str] = None
    sleep_hours: Optional[float] = None
    exercise_minutes: Optional[int] = None
    water_glasses: Optional[int] = None
    notes: Optional[str] = None
    mood: Optional[str] = None
    stress_level: Optional[int] = None  # 1-10 scale
    energy_level: Optional[int] = None  # 1-10 scale

class UserProfile(BaseModel):
    user_id: int
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    activity_level: Optional[str] = None
    goals: Optional[List[str]] = None
    preferences: Optional[Dict[str, Any]] = None

class HobbyEntry(BaseModel):
    user_id: int
    name: str
    category: str
    frequency: Optional[str] = None
    enjoyment_level: Optional[int] = None  # 1-10 scale
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None

class FamilyMember(BaseModel):
    user_id: int
    name: str
    relationship: str
    age: Optional[int] = None
    contact_frequency: Optional[str] = None
    support_level: Optional[int] = None  # 1-10 scale
    notes: Optional[str] = None

@app.get("/health")
async def health():
    return {"service": "enhanced-lifestyle-service", "status": "ok", "version": "1.0.0"}

# Authentication dependency
async def get_current_user_id(request: Request):
    authorization = request.headers.get("Authorization")
    user_id = verify_token(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id

@app.post("/api/lifestyle/log")
async def log_entry(entry: LifestyleEntry, request: Request, user_id: int = Depends(get_current_user_id)):
    """Persist a lifestyle entry with authentication."""
    uid = user_id
    rec = entry.dict()
    rec["ts"] = rec.get("ts") or datetime.now(timezone.utc).isoformat()

    # Try Supabase first (if configured)
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            headers = _supabase_headers()
            headers.update({"Content-Type": "application/json", "Prefer": "return=representation"})
            resp = requests.post(
                f"{SUPABASE_URL}/rest/v1/lifestyle_entries",
                headers=headers,
                json=rec,
                timeout=5,
            )
            if resp.status_code in (200, 201):
                data = resp.json()
                saved = data[0] if isinstance(data, list) and data else data
                print(f"✅ Lifestyle entry saved to database: user_id={uid}")
                return {"ok": True, "saved": saved, "source": "supabase"}
            else:
                print("Supabase insert failed:", resp.status_code, resp.text)
        except Exception as e:
            print("Supabase insert error:", e)

    # Fallback: keep in-memory for local/dev
    _STORE.setdefault(uid, []).append(rec)
    print(f"✅ Lifestyle entry saved to memory: user_id={uid}")
    return {"ok": True, "saved": rec, "source": "memory"}

@app.get("/api/lifestyle/{user_id}")
async def get_entries(user_id: int, current_user_id: int = Depends(get_current_user_id)):
    """Return lifestyle entries for authenticated user."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # If Supabase configured, attempt to read persisted rows
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            resp = requests.get(
                f"{SUPABASE_URL}/rest/v1/lifestyle_entries",
                headers=_supabase_headers(),
                params={"user_id": f"eq.{user_id}", "order": "ts.desc"},
                timeout=5,
            )
            if resp.status_code == 200:
                data = resp.json()
                return {"user_id": user_id, "entries": data, "source": "supabase"}
            else:
                print("Supabase read failed:", resp.status_code, resp.text)
        except Exception as e:
            print("Error querying Supabase lifestyle_entries:", e)

    # Fallback to in-memory store
    return {"user_id": user_id, "entries": _STORE.get(user_id, []), "source": "memory"}

@app.post("/api/lifestyle/profile")
async def create_profile(profile: UserProfile, user_id: int = Depends(get_current_user_id)):
    """Create or update user profile."""
    if profile.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        headers = _supabase_headers()
        headers.update({"Content-Type": "application/json", "Prefer": "return=representation"})
        
        profile_data = profile.dict()
        profile_data["created_at"] = datetime.now(timezone.utc).isoformat()
        
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/user_profiles",
            headers=headers,
            json=profile_data,
            timeout=5,
        )
        
        if resp.status_code in (200, 201):
            data = resp.json()
            saved = data[0] if isinstance(data, list) and data else data
            print(f"✅ User profile saved: user_id={user_id}")
            return {"ok": True, "saved": saved, "source": "supabase"}
        else:
            print("Profile save failed:", resp.status_code, resp.text)
            
    except Exception as e:
        print("Profile save error:", e)
    
    return {"ok": True, "saved": profile_data, "source": "memory"}

@app.get("/api/lifestyle/profile/{user_id}")
async def get_profile(user_id: int, current_user_id: int = Depends(get_current_user_id)):
    """Get user profile."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/user_profiles",
            headers=_supabase_headers(),
            params={"user_id": f"eq.{user_id}"},
            timeout=5,
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if data:
                return {"user_id": user_id, "profile": data[0], "source": "supabase"}
                
    except Exception as e:
        print("Profile fetch error:", e)
    
    return {"user_id": user_id, "profile": None, "source": "none"}

@app.post("/api/lifestyle/hobbies")
async def add_hobby(hobby: HobbyEntry, user_id: int = Depends(get_current_user_id)):
    """Add a hobby for user."""
    if hobby.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        headers = _supabase_headers()
        headers.update({"Content-Type": "application/json", "Prefer": "return=representation"})
        
        hobby_data = hobby.dict()
        hobby_data["created_at"] = datetime.now(timezone.utc).isoformat()
        
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/user_hobbies",
            headers=headers,
            json=hobby_data,
            timeout=5,
        )
        
        if resp.status_code in (200, 201):
            data = resp.json()
            saved = data[0] if isinstance(data, list) and data else data
            print(f"✅ Hobby saved: user_id={user_id}, hobby={hobby.name}")
            return {"ok": True, "saved": saved, "source": "supabase"}
            
    except Exception as e:
        print("Hobby save error:", e)
    
    return {"ok": True, "saved": hobby_data, "source": "memory"}

@app.get("/api/lifestyle/hobbies/{user_id}")
async def get_hobbies(user_id: int, current_user_id: int = Depends(get_current_user_id)):
    """Get user's hobbies."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/user_hobbies",
            headers=_supabase_headers(),
            params={"user_id": f"eq.{user_id}"},
            timeout=5,
        )
        
        if resp.status_code == 200:
            data = resp.json()
            return {"user_id": user_id, "hobbies": data, "source": "supabase"}
            
    except Exception as e:
        print("Hobbies fetch error:", e)
    
    return {"user_id": user_id, "hobbies": [], "source": "none"}

@app.post("/api/lifestyle/family")
async def add_family_member(member: FamilyMember, user_id: int = Depends(get_current_user_id)):
    """Add a family member."""
    if member.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        headers = _supabase_headers()
        headers.update({"Content-Type": "application/json", "Prefer": "return=representation"})
        
        member_data = member.dict()
        member_data["created_at"] = datetime.now(timezone.utc).isoformat()
        
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/family_members",
            headers=headers,
            json=member_data,
            timeout=5,
        )
        
        if resp.status_code in (200, 201):
            data = resp.json()
            saved = data[0] if isinstance(data, list) and data else data
            print(f"✅ Family member saved: user_id={user_id}, member={member.name}")
            return {"ok": True, "saved": saved, "source": "supabase"}
            
    except Exception as e:
        print("Family member save error:", e)
    
    return {"ok": True, "saved": member_data, "source": "memory"}

@app.get("/api/lifestyle/family/{user_id}")
async def get_family_members(user_id: int, current_user_id: int = Depends(get_current_user_id)):
    """Get user's family members."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/family_members",
            headers=_supabase_headers(),
            params={"user_id": f"eq.{user_id}"},
            timeout=5,
        )
        
        if resp.status_code == 200:
            data = resp.json()
            return {"user_id": user_id, "family_members": data, "source": "supabase"}
            
    except Exception as e:
        print("Family members fetch error:", e)
    
    return {"user_id": user_id, "family_members": [], "source": "none"}

@app.post("/api/lifestyle/ai-advice")
async def get_ai_advice(request_data: dict, user_id: int = Depends(get_current_user_id)):
    """Get AI-powered lifestyle advice based on user data."""
    if not GROQ_API_KEY:
        return {"error": "AI service not configured"}
    
    try:
        # Get user's lifestyle data
        lifestyle_resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/lifestyle_entries",
            headers=_supabase_headers(),
            params={"user_id": f"eq.{user_id}", "order": "ts.desc", "limit": 7},
            timeout=5,
        )
        
        # Get user's mood data
        mood_resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/mood_history",
            headers=_supabase_headers(),
            params={"user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": 7},
            timeout=5,
        )
        
        # Get user's profile
        profile_resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/user_profiles",
            headers=_supabase_headers(),
            params={"user_id": f"eq.{user_id}"},
            timeout=5,
        )
        
        # Analyze data and generate advice
        lifestyle_data = lifestyle_resp.json() if lifestyle_resp.status_code == 200 else []
        mood_data = mood_resp.json() if mood_resp.status_code == 200 else []
        profile_data = profile_resp.json() if profile_resp.status_code == 200 else []
        
        # Generate AI advice
        advice = generate_lifestyle_advice(lifestyle_data, mood_data, profile_data, request_data.get("focus_area"))
        
        return {
            "user_id": user_id,
            "advice": advice,
            "data_summary": {
                "lifestyle_entries": len(lifestyle_data),
                "mood_entries": len(mood_data),
                "has_profile": len(profile_data) > 0
            }
        }
        
    except Exception as e:
        print(f"AI advice error: {e}")
        return {"error": "Failed to generate advice", "details": str(e)}

def generate_lifestyle_advice(lifestyle_data, mood_data, profile_data, focus_area=None):
    """Generate personalized lifestyle advice using AI."""
    
    # Analyze patterns
    avg_sleep = 0
    avg_exercise = 0
    avg_stress = 0
    
    if lifestyle_data:
        sleep_hours = [entry.get("sleep_hours", 0) for entry in lifestyle_data if entry.get("sleep_hours")]
        exercise_mins = [entry.get("exercise_minutes", 0) for entry in lifestyle_data if entry.get("exercise_minutes")]
        stress_levels = [entry.get("stress_level", 0) for entry in lifestyle_data if entry.get("stress_level")]
        
        if sleep_hours:
            avg_sleep = sum(sleep_hours) / len(sleep_hours)
        if exercise_mins:
            avg_exercise = sum(exercise_mins) / len(exercise_mins)
        if stress_levels:
            avg_stress = sum(stress_levels) / len(stress_levels)
    
    # Analyze mood patterns
    mood_summary = {}
    if mood_data:
        emotions = [entry.get("emotion", "neutral") for entry in mood_data]
        mood_counts = {}
        for emotion in emotions:
            mood_counts[emotion] = mood_counts.get(emotion, 0) + 1
        mood_summary = mood_counts
    
    # Generate advice based on focus area
    advice = {
        "sleep": [],
        "exercise": [],
        "stress": [],
        "mood": [],
        "general": []
    }
    
    # Sleep advice
    if avg_sleep < 7:
        advice["sleep"].append("ඔබගේ නින්ද ප්‍රමාණය අඩුයි. දිනකට පැය 7-8 ක් නින්දෙන් ඉවත් වීමට උත්සාහ කරන්න.")
    elif avg_sleep > 9:
        advice["sleep"].append("ඔබට වැඩි නින්දක් යනවා. වැඩියෙන් සක්‍රීය වීමට උත්සාහ කරන්න.")
    else:
        advice["sleep"].append("ඔබගේ නින්ද ප්‍රමාණය සාමාන්‍යයි. හොඳ පුරුද්දක්!")
    
    # Exercise advice
    if avg_exercise < 30:
        advice["exercise"].append("දිනකට විනාඩි 30 ක් වත් ව්‍යායාම කිරීම ආරම්භ කරන්න.")
    elif avg_exercise < 60:
        advice["exercise"].append("ව්‍යායාම කාලය වැඩි කරන්න. දිනකට විනාඩි 45-60 ක් උත්තම වේ.")
    else:
        advice["exercise"].append("ඔබ හොඳින් ව්‍යායාම කරනවා! එම පුරුද්ද කරගෙන යන්න.")
    
    # Stress advice
    if avg_stress > 7:
        advice["stress"].append("ඔබගේ ආතතිය ඉහළ මට්ටමක පවතිනවා. භාවනාව, සුසුම් හෝ සැහැල්ලු ව්‍යායාම උත්සාහ කරන්න.")
    elif avg_stress > 5:
        advice["stress"].append("ආතතිය කළමනාකරණය කිරීමට වැඩි අවධානය යොමු කරන්න.")
    else:
        advice["stress"].append("ඔබගේ ආතති මට්ටම කළමනාකරණය කර ඇත.")
    
    # Mood advice
    if mood_summary:
        dominant_mood = max(mood_summary, key=mood_summary.get)
        if dominant_mood in ["sad", "angry", "fear"]:
            advice["mood"].append(f"ඔබ නිතර {dominant_mood} වන්නේ පෙනේ. සහාය ලබා ගැනීමට බිය විය යුතු නැහැ.")
        elif dominant_mood == "happy":
            advice["mood"].append("ඔබගේ ආත්මය ඉහළයි! එය ආරක්ෂා කරගෙන යන්න.")
    
    # General advice
    advice["general"].append("දිනපතා ජලය පානය කිරීමට සහ සෑම දිනකම සමාන කාල සටහනකට අනුගමනය කිරීමට උත්සාහ කරන්න.")
    
    # Return focused advice if specified
    if focus_area and focus_area in advice:
        return {"focus_area": focus_area, "advice": advice[focus_area]}
    
    return advice

@app.post("/api/lifestyle/profile")
async def create_profile(profile: UserProfile, user_id: int = Depends(get_current_user_id)):
    """Create or update user profile."""
    if profile.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Get lifestyle data
        lifestyle_resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/lifestyle_entries",
            headers=_supabase_headers(),
            params={"user_id": f"eq.{user_id}", "order": "ts.desc", "limit": 30},
            timeout=5,
        )
        
        # Get mood data
        mood_resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/mood_history",
            headers=_supabase_headers(),
            params={"user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": 30},
            timeout=5,
        )
        
        # Get profile
        profile_resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/user_profiles",
            headers=_supabase_headers(),
            params={"user_id": f"eq.{user_id}"},
            timeout=5,
        )
        
        # Get hobbies
        hobbies_resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/user_hobbies",
            headers=_supabase_headers(),
            params={"user_id": f"eq.{user_id}"},
            timeout=5,
        )
        
        # Get family members
        family_resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/family_members",
            headers=_supabase_headers(),
            params={"user_id": f"eq.{user_id}"},
            timeout=5,
        )
        
        lifestyle_data = lifestyle_resp.json() if lifestyle_resp.status_code == 200 else []
        mood_data = mood_resp.json() if mood_resp.status_code == 200 else []
        profile_data = profile_resp.json() if profile_resp.status_code == 200 else []
        hobbies_data = hobbies_resp.json() if hobbies_resp.status_code == 200 else []
        family_data = family_resp.json() if family_resp.status_code == 200 else []
        
        # Generate charts data
        charts_data = generate_charts_data(lifestyle_data, mood_data, hobbies_data, family_data)
        
        return {
            "user_id": user_id,
            "profile": profile_data[0] if profile_data else None,
            "charts": charts_data,
            "recent_lifestyle": lifestyle_data[:7],
            "recent_moods": mood_data[:7],
            "hobbies": hobbies_data,
            "family_members": family_data,
            "data_summary": {
                "lifestyle_entries": len(lifestyle_data),
                "mood_entries": len(mood_data),
                "hobbies_count": len(hobbies_data),
                "family_members_count": len(family_data)
            }
        }
        
    except Exception as e:
        print(f"Dashboard error: {e}")
        return {"error": "Failed to load dashboard", "details": str(e)}

def generate_charts_data(lifestyle_data, mood_data, hobbies_data, family_data):
    """Generate data for various charts."""
    
    # 1. Mood History Pie Chart
    mood_counts = {}
    if mood_data:
        for mood in mood_data:
            emotion = mood.get("emotion", "neutral")
            mood_counts[emotion] = mood_counts.get(emotion, 0) + 1
    
    mood_pie_chart = {
        "type": "pie",
        "title": "ඔබගේ ආදර්ශ විග්‍රහය (Mood Distribution)",
        "data": [
            {"label": emotion.capitalize(), "value": count, "color": get_emotion_color(emotion)}
            for emotion, count in mood_counts.items()
        ]
    }
    
    # 2. Sleep Pattern Bar Chart
    sleep_data = []
    if lifestyle_data:
        # Group by date
        daily_sleep = {}
        for entry in lifestyle_data:
            if entry.get("sleep_hours"):
                date = entry.get("ts", "").split("T")[0]
                if date not in daily_sleep:
                    daily_sleep[date] = 0
                daily_sleep[date] += entry.get("sleep_hours", 0)
        
        # Get last 7 days
        sorted_dates = sorted(daily_sleep.keys())[-7:]
        sleep_data = [
            {"date": date, "hours": daily_sleep[date]}
            for date in sorted_dates
        ]
    
    sleep_bar_chart = {
        "type": "bar",
        "title": "නින්ද රිදීමේ රටාව (Sleep Pattern - Last 7 Days)",
        "data": sleep_data,
        "xAxis": "date",
        "yAxis": "hours",
        "target": 8  # Recommended sleep hours
    }
    
    # 3. Exercise Trend Line Chart
    exercise_data = []
    if lifestyle_data:
        # Group by date
        daily_exercise = {}
        for entry in lifestyle_data:
            if entry.get("exercise_minutes"):
                date = entry.get("ts", "").split("T")[0]
                if date not in daily_exercise:
                    daily_exercise[date] = 0
                daily_exercise[date] += entry.get("exercise_minutes", 0)
        
        # Get last 7 days
        sorted_dates = sorted(daily_exercise.keys())[-7:]
        exercise_data = [
            {"date": date, "minutes": daily_exercise[date]}
            for date in sorted_dates
        ]
    
    exercise_line_chart = {
        "type": "line",
        "title": "ව්‍යායාම ප්‍රවණතාව (Exercise Trend - Last 7 Days)",
        "data": exercise_data,
        "xAxis": "date",
        "yAxis": "minutes",
        "target": 30  # Recommended daily exercise
    }
    
    # 4. Stress Level Gauge Chart
    stress_levels = []
    if lifestyle_data:
        stress_levels = [
            entry.get("stress_level", 5)
            for entry in lifestyle_data[-7:]  # Last 7 entries
            if entry.get("stress_level")
        ]
    
    avg_stress = sum(stress_levels) / len(stress_levels) if stress_levels else 5
    
    stress_gauge = {
        "type": "gauge",
        "title": "ආතති මට්ටම (Stress Level)",
        "value": avg_stress,
        "min": 1,
        "max": 10,
        "zones": [
            {"min": 1, "max": 3, "color": "#4CAF50", "label": "අඩු (Low)"},
            {"min": 4, "max": 6, "color": "#FFC107", "label": "මධ්‍යම (Medium)"},
            {"min": 7, "max": 10, "color": "#F44336", "label": "ඉහළ (High)"}
        ]
    }
    
    # 5. Hobby Categories Donut Chart
    hobby_categories = {}
    if hobbies_data:
        for hobby in hobbies_data:
            category = hobby.get("category", "other")
            hobby_categories[category] = hobby_categories.get(category, 0) + 1
    
    hobby_donut = {
        "type": "donut",
        "title": "ආකල්මන වර්ග (Hobby Categories)",
        "data": [
            {"label": category.capitalize(), "value": count}
            for category, count in hobby_categories.items()
        ]
    }
    
    # 6. Family Support Radar Chart
    family_support = []
    if family_data:
        family_support = [
            {
                "member": member.get("name", "Unknown"),
                "support": member.get("support_level", 5)
            }
            for member in family_data
        ]
    
    family_radar = {
        "type": "radar",
        "title": "පවුල් සහාය (Family Support)",
        "data": family_support,
        "axes": "member",
        "values": "support"
    }
    
    # 7. Weekly Summary Stats
    weekly_stats = calculate_weekly_stats(lifestyle_data, mood_data)
    
    return {
        "mood_pie": mood_pie_chart,
        "sleep_bar": sleep_bar_chart,
        "exercise_line": exercise_line_chart,
        "stress_gauge": stress_gauge,
        "hobby_donut": hobby_donut,
        "family_radar": family_radar,
        "weekly_stats": weekly_stats
    }

def get_emotion_color(emotion):
    """Get color for emotion."""
    colors = {
        "happy": "#4CAF50",
        "sad": "#2196F3", 
        "angry": "#F44336",
        "fear": "#9C27B0",
        "surprised": "#FF9800",
        "disgust": "#795548",
        "neutral": "#9E9E9E"
    }
    return colors.get(emotion.lower(), "#9E9E9E")

def calculate_weekly_stats(lifestyle_data, mood_data):
    """Calculate weekly statistics."""
    
    # Filter last 7 days
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    
    recent_lifestyle = [
        entry for entry in lifestyle_data
        if entry.get("ts") and datetime.fromisoformat(entry.get("ts").replace("Z", "+00:00")) >= week_ago
    ]
    
    recent_moods = [
        mood for mood in mood_data
        if mood.get("created_at") and datetime.fromisoformat(mood.get("created_at").replace("Z", "+00:00")) >= week_ago
    ]
    
    # Calculate averages
    avg_sleep = 0
    avg_exercise = 0
    avg_stress = 0
    avg_energy = 0
    
    if recent_lifestyle:
        sleep_hours = [entry.get("sleep_hours", 0) for entry in recent_lifestyle if entry.get("sleep_hours")]
        exercise_mins = [entry.get("exercise_minutes", 0) for entry in recent_lifestyle if entry.get("exercise_minutes")]
        stress_levels = [entry.get("stress_level", 0) for entry in recent_lifestyle if entry.get("stress_level")]
        energy_levels = [entry.get("energy_level", 0) for entry in recent_lifestyle if entry.get("energy_level")]
        
        if sleep_hours:
            avg_sleep = round(sum(sleep_hours) / len(sleep_hours), 1)
        if exercise_mins:
            avg_exercise = round(sum(exercise_mins) / len(exercise_mins), 0)
        if stress_levels:
            avg_stress = round(sum(stress_levels) / len(stress_levels), 1)
        if energy_levels:
            avg_energy = round(sum(energy_levels) / len(energy_levels), 1)
    
    # Mood distribution
    mood_counts = {}
    if recent_moods:
        for mood in recent_moods:
            emotion = mood.get("emotion", "neutral")
            mood_counts[emotion] = mood_counts.get(emotion, 0) + 1
    
    dominant_mood = max(mood_counts, key=mood_counts.get) if mood_counts else "neutral"
    
    return {
        "period": "Last 7 Days",
        "entries_count": len(recent_lifestyle),
        "moods_count": len(recent_moods),
        "avg_sleep_hours": avg_sleep,
        "avg_exercise_minutes": avg_exercise,
        "avg_stress_level": avg_stress,
        "avg_energy_level": avg_energy,
        "dominant_mood": dominant_mood,
        "mood_distribution": mood_counts,
        "goals_met": {
            "sleep": avg_sleep >= 7,
            "exercise": avg_exercise >= 30,
            "stress": avg_stress <= 5
        }
    }

@app.get("/api/lifestyle/charts/mood-history/{user_id}")
async def get_mood_history_chart(user_id: int, days: int = 30, current_user_id: int = Depends(get_current_user_id)):
    """Get detailed mood history chart data."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Get mood data for specified period
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/mood_history",
            headers=_supabase_headers(),
            params={
                "user_id": f"eq.{user_id}",
                "order": "created_at.desc",
                "limit": days
            },
            timeout=5,
        )
        
        if resp.status_code != 200:
            return {"error": "Failed to fetch mood data"}
        
        mood_data = resp.json()
        
        # Process data for charts
        timeline_data = []
        emotion_timeline = {}
        
        for mood in mood_data:
            created_at = mood.get("created_at", "")
            emotion = mood.get("emotion", "neutral")
            confidence = mood.get("confidence", 0)
            
            # Extract date
            date = created_at.split("T")[0] if "T" in created_at else created_at
            
            if date not in emotion_timeline:
                emotion_timeline[date] = []
            
            emotion_timeline[date].append({
                "emotion": emotion,
                "confidence": confidence,
                "time": created_at.split("T")[1][:5] if "T" in created_at else "",
                "source": mood.get("source", "unknown")
            })
        
        # Create timeline data
        for date in sorted(emotion_timeline.keys())[-days:]:
            day_moods = emotion_timeline[date]
            if day_moods:
                # Get dominant emotion for the day
                emotion_counts = {}
                for mood_entry in day_moods:
                    emotion = mood_entry["emotion"]
                    emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
                
                dominant_emotion = max(emotion_counts, key=emotion_counts.get)
                avg_confidence = sum(m["confidence"] for m in day_moods) / len(day_moods)
                
                timeline_data.append({
                    "date": date,
                    "dominant_emotion": dominant_emotion,
                    "confidence": round(avg_confidence, 2),
                    "mood_count": len(day_moods),
                    "color": get_emotion_color(dominant_emotion),
                    "details": day_moods
                })
        
        # Create emotion frequency data
        emotion_frequency = {}
        for mood in mood_data:
            emotion = mood.get("emotion", "neutral")
            emotion_frequency[emotion] = emotion_frequency.get(emotion, 0) + 1
        
        return {
            "user_id": user_id,
            "period_days": days,
            "timeline": timeline_data,
            "emotion_frequency": [
                {"emotion": emotion, "count": count, "color": get_emotion_color(emotion)}
                for emotion, count in emotion_frequency.items()
            ],
            "total_moods": len(mood_data),
            "unique_emotions": len(emotion_frequency)
        }
        
    except Exception as e:
        print(f"Mood history chart error: {e}")
        return {"error": "Failed to generate mood chart", "details": str(e)}

@app.get("/api/lifestyle/moods/today/{user_id}")
async def moods_today(user_id: int):
    """Fetch mood_history entries for the user for today from Supabase (if configured)."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return {"user_id": user_id, "moods": []}

    # start of day UTC
    now = datetime.now(timezone.utc)
    start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc).isoformat()

    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/mood_history",
            headers=_supabase_headers(),
            params={
                "user_id": f"eq.{user_id}",
                "created_at": f"gte.{start}",
                "order": "created_at.asc"
            },
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            # normalize fields
            items = [
                {
                    "emotion": d.get("emotion"),
                    "confidence": d.get("confidence"),
                    "ts": d.get("created_at"),
                    "source": d.get("source"),
                }
                for d in data
            ]
            return {"user_id": user_id, "moods": items}
    except Exception as e:
        print("Error querying Supabase for moods today:", e)

    return {"user_id": user_id, "moods": []}

@app.get("/api/lifestyle/moods/last/{user_id}")
async def moods_last(user_id: int, limit: int = 7):
    """Return last N mood entries for user (Supabase)"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return {"user_id": user_id, "moods": []}

    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/mood_history",
            headers=_supabase_headers(),
            params={
                "user_id": f"eq.{user_id}",
                "order": "created_at.desc",
                "limit": limit,
            },
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            items = [
                {
                    "emotion": d.get("emotion"),
                    "confidence": d.get("confidence"),
                    "ts": d.get("created_at"),
                    "source": d.get("source"),
                }
                for d in data
            ]
            return {"user_id": user_id, "moods": items}
    except Exception as e:
        print("Error querying Supabase for last moods:", e)

    return {"user_id": user_id, "moods": []}

@app.get("/api/lifestyle/moods/chart-data/{user_id}")
async def moods_chart_data(user_id: int, days: int = 7):
    """Get mood data formatted for charts (pie chart data)"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return {"user_id": user_id, "chart_data": [], "moods": []}

    # Get mood data for specified period
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=days)).isoformat()

    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/mood_history",
            headers=_supabase_headers(),
            params={
                "user_id": f"eq.{user_id}",
                "created_at": f"gte.{start}",
                "order": "created_at.desc"
            },
            timeout=5,
        )
        
        if resp.status_code == 200:
            data = resp.json()
            
            # Count emotions for pie chart
            emotion_counts = {}
            for mood in data:
                emotion = mood.get("emotion", "neutral")
                emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            
            # Format for mobile app pie chart
            palette = {
                "happy": "#4CAF50",
                "sad": "#2196F3", 
                "angry": "#F44336",
                "neutral": "#9E9E9E",
                "fear": "#9C27B0",
                "surprised": "#FF9800",
                "disgust": "#795548",
                "other": "#FFB74D"
            }
            
            chart_data = []
            for emotion, count in emotion_counts.items():
                chart_data.append({
                    "name": emotion.capitalize(),
                    "population": count,
                    "color": palette.get(emotion.lower(), "#ccc"),
                    "legendFontColor": "#333",
                    "legendFontSize": 12
                })
            
            # Also return normalized mood data
            moods = [
                {
                    "emotion": d.get("emotion"),
                    "confidence": d.get("confidence"),
                    "ts": d.get("created_at"),
                    "source": d.get("source"),
                }
                for d in data
            ]
            
            return {
                "user_id": user_id,
                "chart_data": chart_data,
                "moods": moods,
                "total_moods": len(data),
                "unique_emotions": len(emotion_counts),
                "period_days": days
            }
            
    except Exception as e:
        print("Error querying Supabase for mood chart data:", e)

    return {"user_id": user_id, "chart_data": [], "moods": []}

@app.get("/api/lifestyle/moods/bar-chart/{user_id}")
async def moods_bar_chart(user_id: int, days: int = 7):
    """Get mood data formatted for bar chart with color-coded bars"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return {"user_id": user_id, "bar_data": [], "moods": []}

    # Get mood data for specified period
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=days)).isoformat()

    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/mood_history",
            headers=_supabase_headers(),
            params={
                "user_id": f"eq.{user_id}",
                "created_at": f"gte.{start}",
                "order": "created_at.asc"
            },
            timeout=5,
        )
        
        if resp.status_code == 200:
            data = resp.json()
            
            # Group by date and get dominant emotion per day
            daily_moods = {}
            for mood in data:
                created_at = mood.get("created_at", "")
                date = created_at.split("T")[0] if "T" in created_at else created_at
                
                if date not in daily_moods:
                    daily_moods[date] = []
                
                daily_moods[date].append({
                    "emotion": mood.get("emotion"),
                    "confidence": mood.get("confidence"),
                    "source": mood.get("source")
                })
            
            # Create bar chart data
            bar_data = []
            emotion_colors = {
                "happy": "#4CAF50",
                "sad": "#2196F3", 
                "angry": "#F44336",
                "neutral": "#9E9E9E",
                "fear": "#9C27B0",
                "surprised": "#FF9800",
                "disgust": "#795548",
                "excited": "#FFEB3B"
            }
            
            # Generate data for last 7 days
            for i in range(days):
                date = (now - timedelta(days=days-1-i)).strftime("%Y-%m-%d")
                
                if date in daily_moods:
                    # Find dominant emotion for the day
                    emotion_counts = {}
                    for mood_entry in daily_moods[date]:
                        emotion = mood_entry["emotion"]
                        emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
                    
                    dominant_emotion = max(emotion_counts, key=emotion_counts.get)
                    avg_confidence = sum(m["confidence"] for m in daily_moods[date]) / len(daily_moods[date])
                    mood_count = len(daily_moods[date])
                    
                    bar_data.append({
                        "date": date,
                        "day_name": (now - timedelta(days=days-1-i)).strftime("%a"),
                        "emotion": dominant_emotion.capitalize(),
                        "confidence": round(avg_confidence, 2),
                        "mood_count": mood_count,
                        "color": emotion_colors.get(dominant_emotion.lower(), "#9E9E9E"),
                        "value": mood_count,  # Bar height based on mood count
                        "details": daily_moods[date]
                    })
                else:
                    # No data for this day
                    bar_data.append({
                        "date": date,
                        "day_name": (now - timedelta(days=days-1-i)).strftime("%a"),
                        "emotion": "No Data",
                        "confidence": 0,
                        "mood_count": 0,
                        "color": "#E0E0E0",
                        "value": 0,
                        "details": []
                    })
            
            # Also return normalized mood data for pie chart
            moods = [
                {
                    "emotion": d.get("emotion"),
                    "confidence": d.get("confidence"),
                    "ts": d.get("created_at"),
                    "source": d.get("source"),
                }
                for d in data
            ]
            
            # Calculate pie chart data
            emotion_counts = {}
            for mood in data:
                emotion = mood.get("emotion", "neutral")
                emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            
            pie_data = []
            for emotion, count in emotion_counts.items():
                pie_data.append({
                    "name": emotion.capitalize(),
                    "population": count,
                    "color": emotion_colors.get(emotion.lower(), "#ccc"),
                    "legendFontColor": "#333",
                    "legendFontSize": 12
                })
            
            return {
                "user_id": user_id,
                "bar_data": bar_data,
                "pie_data": pie_data,
                "moods": moods,
                "total_moods": len(data),
                "unique_emotions": len(emotion_counts),
                "period_days": days,
                "chart_info": {
                    "bar_chart": {
                        "title": "7-Day Mood Trend",
                        "xAxis": "Day",
                        "yAxis": "Mood Count",
                        "color_legend": {
                            "Happy": "#4CAF50",
                            "Sad": "#2196F3",
                            "Angry": "#F44336", 
                            "Neutral": "#9E9E9E",
                            "Fear": "#9C27B0",
                            "Surprised": "#FF9800",
                            "Disgust": "#795548",
                            "Excited": "#FFEB3B"
                        }
                    },
                    "pie_chart": {
                        "title": "Mood Distribution"
                    }
                }
            }
            
    except Exception as e:
        print("Error querying Supabase for mood bar chart:", e)

    return {"user_id": user_id, "bar_data": [], "pie_data": [], "moods": []}

@app.get("/api/demo/combined-charts/{user_id}")
async def demo_combined_charts(user_id: int, days: int = 7):
    """Demo combined charts with sample 7-day data"""
    
    # Generate sample mood data for last 7 days
    import random
    emotions = ["happy", "sad", "angry", "neutral", "excited", "surprised"]
    sources = ["photo_analysis", "chat", "manual"]
    
    emotion_colors = {
        "happy": "#4CAF50",
        "sad": "#2196F3", 
        "angry": "#F44336",
        "neutral": "#9E9E9E",
        "fear": "#9C27B0",
        "surprised": "#FF9800",
        "disgust": "#795548",
        "excited": "#FFEB3B"
    }
    
    now = datetime.now(timezone.utc)
    
    # Generate bar data for 7 days
    bar_data = []
    for i in range(days):
        date = (now - timedelta(days=days-1-i)).strftime("%Y-%m-%d")
        day_name = (now - timedelta(days=days-1-i)).strftime("%a")
        
        # Random mood count for the day (1-5 moods)
        mood_count = random.randint(1, 5)
        dominant_emotion = random.choice(emotions)
        confidence = round(random.uniform(0.7, 0.95), 2)
        
        # Generate daily mood details
        daily_moods = []
        for j in range(mood_count):
            hour = random.randint(8, 22)
            minute = random.randint(0, 59)
            daily_moods.append({
                "emotion": dominant_emotion if j == 0 else random.choice(emotions),
                "confidence": round(random.uniform(0.7, 0.95), 2),
                "source": random.choice(sources),
                "time": f"{hour:02d}:{minute:02d}"
            })
        
        bar_data.append({
            "date": date,
            "day_name": day_name,
            "emotion": dominant_emotion.capitalize(),
            "confidence": confidence,
            "mood_count": mood_count,
            "color": emotion_colors.get(dominant_emotion.lower(), "#9E9E9E"),
            "value": mood_count,
            "details": daily_moods
        })
    
    # Generate pie chart data from all moods
    all_moods = []
    emotion_counts = {}
    
    for day in bar_data:
        for mood in day["details"]:
            emotion = mood["emotion"]
            all_moods.append({
                "emotion": emotion,
                "confidence": mood["confidence"],
                "ts": f"{day['date']}T{mood['time']}:00Z",
                "source": mood["source"]
            })
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
    
    # Create pie data
    pie_data = []
    for emotion, count in emotion_counts.items():
        pie_data.append({
            "name": emotion.capitalize(),
            "population": count,
            "color": emotion_colors.get(emotion.lower(), "#ccc"),
            "legendFontColor": "#333",
            "legendFontSize": 12
        })
    
    return {
        "user_id": user_id,
        "bar_data": bar_data,
        "pie_data": pie_data,
        "moods": all_moods,
        "total_moods": len(all_moods),
        "unique_emotions": len(emotion_counts),
        "period_days": days,
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "chart_info": {
            "bar_chart": {
                "title": "7-Day Mood Trend (Demo)",
                "xAxis": "Day",
                "yAxis": "Mood Count",
                "color_legend": emotion_colors
            },
            "pie_chart": {
                "title": "Overall Mood Distribution (Demo)"
            }
        },
        "summary": {
            "most_common_emotion": max(emotion_counts, key=emotion_counts.get) if emotion_counts else "neutral",
            "total_days_with_data": len([d for d in bar_data if d["mood_count"] > 0]),
            "average_moods_per_day": round(len(all_moods) / max(1, len([d for d in bar_data if d["mood_count"] > 0])), 1)
        },
        "demo_info": {
            "message": "This is demo data for 7-day mood visualization",
            "generated_entries": len(all_moods),
            "date_range": f"Last {days} days",
            "colors_used": list(emotion_colors.values())
        }
    }

@app.get("/api/lifestyle/moods/combined-charts/{user_id}")
async def combined_charts(user_id: int, days: int = 7):
    """Get both bar chart and pie chart data for mood visualization"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return {"user_id": user_id, "bar_data": [], "pie_data": [], "moods": []}

    # Get mood data for specified period
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=days)).isoformat()

    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/mood_history",
            headers=_supabase_headers(),
            params={
                "user_id": f"eq.{user_id}",
                "created_at": f"gte.{start}",
                "order": "created_at.asc"
            },
            timeout=5,
        )
        
        if resp.status_code == 200:
            data = resp.json()
            
            # Group by date and get dominant emotion per day
            daily_moods = {}
            for mood in data:
                created_at = mood.get("created_at", "")
                date = created_at.split("T")[0] if "T" in created_at else created_at
                
                if date not in daily_moods:
                    daily_moods[date] = []
                
                daily_moods[date].append({
                    "emotion": mood.get("emotion"),
                    "confidence": mood.get("confidence"),
                    "source": mood.get("source")
                })
            
            # Emotion colors for both charts
            emotion_colors = {
                "happy": "#4CAF50",
                "sad": "#2196F3", 
                "angry": "#F44336",
                "neutral": "#9E9E9E",
                "fear": "#9C27B0",
                "surprised": "#FF9800",
                "disgust": "#795548",
                "excited": "#FFEB3B"
            }
            
            # Create BAR CHART data (7 days)
            bar_data = []
            for i in range(days):
                date = (now - timedelta(days=days-1-i)).strftime("%Y-%m-%d")
                
                if date in daily_moods:
                    # Find dominant emotion for the day
                    emotion_counts = {}
                    for mood_entry in daily_moods[date]:
                        emotion = mood_entry["emotion"]
                        emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
                    
                    dominant_emotion = max(emotion_counts, key=emotion_counts.get)
                    avg_confidence = sum(m["confidence"] for m in daily_moods[date]) / len(daily_moods[date])
                    mood_count = len(daily_moods[date])
                    
                    bar_data.append({
                        "date": date,
                        "day_name": (now - timedelta(days=days-1-i)).strftime("%a"),
                        "emotion": dominant_emotion.capitalize(),
                        "confidence": round(avg_confidence, 2),
                        "mood_count": mood_count,
                        "color": emotion_colors.get(dominant_emotion.lower(), "#9E9E9E"),
                        "value": mood_count,  # Bar height
                        "details": daily_moods[date]
                    })
                else:
                    # No data for this day
                    bar_data.append({
                        "date": date,
                        "day_name": (now - timedelta(days=days-1-i)).strftime("%a"),
                        "emotion": "No Data",
                        "confidence": 0,
                        "mood_count": 0,
                        "color": "#E0E0E0",
                        "value": 0,
                        "details": []
                    })
            
            # Create PIE CHART data (overall distribution)
            emotion_counts = {}
            for mood in data:
                emotion = mood.get("emotion", "neutral")
                emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            
            pie_data = []
            for emotion, count in emotion_counts.items():
                pie_data.append({
                    "name": emotion.capitalize(),
                    "population": count,
                    "color": emotion_colors.get(emotion.lower(), "#ccc"),
                    "legendFontColor": "#333",
                    "legendFontSize": 12
                })
            
            # Also return normalized mood data
            moods = [
                {
                    "emotion": d.get("emotion"),
                    "confidence": d.get("confidence"),
                    "ts": d.get("created_at"),
                    "source": d.get("source"),
                }
                for d in data
            ]
            
            return {
                "user_id": user_id,
                "bar_data": bar_data,
                "pie_data": pie_data,
                "moods": moods,
                "total_moods": len(data),
                "unique_emotions": len(emotion_counts),
                "period_days": days,
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "chart_info": {
                    "bar_chart": {
                        "title": "7-Day Mood Trend",
                        "xAxis": "Day",
                        "yAxis": "Mood Count",
                        "color_legend": emotion_colors
                    },
                    "pie_chart": {
                        "title": "Overall Mood Distribution"
                    }
                },
                "summary": {
                    "most_common_emotion": max(emotion_counts, key=emotion_counts.get) if emotion_counts else "neutral",
                    "total_days_with_data": len([d for d in bar_data if d["mood_count"] > 0]),
                    "average_moods_per_day": round(len(data) / max(1, len([d for d in bar_data if d["mood_count"] > 0])), 1)
                }
            }
            
    except Exception as e:
        print("Error querying Supabase for combined charts:", e)

    return {"user_id": user_id, "bar_data": [], "pie_data": [], "moods": []}

@app.get("/api/lifestyle/week/{user_id}")
async def get_week(user_id: int):
    # existing behavior: aggregate from in-memory _STORE and return summary
    now = datetime.now(timezone.utc)
    entries = _STORE.get(user_id, [])
    since = now - timedelta(days=7)
    filtered = [e for e in entries if e.get("ts") and datetime.fromisoformat(e.get("ts")) >= since]
    summary = {
        "user_id": user_id,
        "days": 7,
        "avg_sleep": round(sum((e.get("sleep_hours") or 0) for e in filtered) / max(1, len(filtered)), 2) if filtered else 0,
        "avg_exercise_mins": int(sum((e.get("exercise_minutes") or 0) for e in filtered) / max(1, len(filtered))) if filtered else 0,
        "total_entries": len(filtered),
    }
    return summary

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8005)
