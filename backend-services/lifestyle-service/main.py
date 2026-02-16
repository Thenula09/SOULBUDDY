"""
SoulBuddy Lifestyle Service
Simple FastAPI service used by the mobile app to store / expose lifestyle entries
and to provide mood-based chart data (uses Supabase when configured, local JSONL
fallback otherwise).

Endpoints implemented (compatible with frontend `LifestyleScreen`):
- GET  /health
- POST /api/lifestyle/log
- GET  /api/lifestyle/{user_id}
- GET  /api/lifestyle/week/{user_id}
- GET  /api/lifestyle/moods/today/{user_id}
- GET  /api/lifestyle/moods/last/{user_id}
- GET  /api/lifestyle/moods/combined-charts/{user_id}
- GET  /api/demo/combined-charts/{user_id}

Run: python main.py  (starts on port 8005)
"""

import os
import json
from datetime import datetime, timedelta, timezone, date
from typing import List, Dict, Any, Optional

import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# Config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
LOCAL_MOOD_FILE = os.path.join(os.path.dirname(__file__), '..', 'chat-ai-service', 'local_mood_history.jsonl')

app = FastAPI(title="SoulBuddy Lifestyle Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for lifestyle entries (dev)
LIFESTYLE_STORE: Dict[int, List[Dict[str, Any]]] = {}

# --- Helpers ---
def _supabase_headers() -> Dict[str, str]:
    if not SUPABASE_KEY:
        return {}
    return {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}

def _read_local_mood_history(user_id: int = None) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    try:
        with open(LOCAL_MOOD_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                    if user_id is None or int(obj.get('user_id')) == int(user_id):
                        items.append(obj)
                except Exception:
                    continue
    except FileNotFoundError:
        # No local file -> return empty list
        return []
    return sorted(items, key=lambda x: x.get('created_at') or x.get('ts') or '', reverse=True)

def _fetch_moods_from_supabase(user_id: int, limit: Optional[int] = None, since_iso: Optional[str] = None) -> List[Dict[str, Any]]:
    """Try user_moods -> mood_history fallbacks against Supabase REST API."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return []

    headers = _supabase_headers()
    headers['Content-Type'] = 'application/json'

    params = {"user_id": f"eq.{user_id}", "order": "created_at.desc"}
    if limit:
        params['limit'] = str(limit)
    if since_iso:
        params['created_at'] = f"gte.{since_iso}"

    # Try primary table `user_moods` then `mood_history`
    for table in ("user_moods", "mood_history"):
        try:
            resp = requests.get(f"{SUPABASE_URL}/rest/v1/{table}", headers=headers, params=params, timeout=6)
            if resp.status_code == 200:
                data = resp.json()
                # normalize created_at -> ts for frontend
                for d in data:
                    if 'created_at' in d and 'ts' not in d:
                        d['ts'] = d['created_at']
                return data
        except Exception:
            continue
    return []

# --- API Schemas ---
class LifestyleLog(BaseModel):
    user_id: int
    ts: Optional[str] = None
    sleep_hours: Optional[float] = None
    exercise_minutes: Optional[int] = None
    water_glasses: Optional[int] = None
    notes: Optional[str] = None

# --- Endpoints ---
@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/api/lifestyle/log")
def log_lifestyle(payload: LifestyleLog):
    """Store a lifestyle entry (in-memory for dev; try Supabase when configured)."""
    entry = payload.model_dump()
    user_id = int(entry['user_id'])
    ts = entry.get('ts') or datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()
    entry['ts'] = ts
    entry['created_at'] = ts

    # save in-memory
    LIFESTYLE_STORE.setdefault(user_id, [])
    LIFESTYLE_STORE[user_id].insert(0, entry)

    # Try to persist to Supabase (best-effort)
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            headers = _supabase_headers()
            headers['Content-Type'] = 'application/json'
            payload_to_db = {
                'user_id': user_id,
                'ts': ts,
                'sleep_hours': entry.get('sleep_hours'),
                'exercise_minutes': entry.get('exercise_minutes'),
                'water_glasses': entry.get('water_glasses'),
                'notes': entry.get('notes')
            }
            r = requests.post(f"{SUPABASE_URL}/rest/v1/lifestyle_entries", headers=headers, json=payload_to_db, timeout=5)
            if r.status_code in (200, 201):
                entry['source'] = 'supabase'
        except Exception:
            entry['source'] = 'memory'
    else:
        entry['source'] = 'memory'

    return {"entry": entry}

@app.get("/api/lifestyle/{user_id}")
def get_lifestyle(user_id: int, limit: int = Query(50, description="max entries")):
    """Return lifestyle entries for a user (prefers Supabase when available)."""
    user_id = int(user_id)
    entries: List[Dict[str, Any]] = []

    if SUPABASE_URL and SUPABASE_KEY:
        try:
            headers = _supabase_headers()
            params = {"user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": str(limit)}
            r = requests.get(f"{SUPABASE_URL}/rest/v1/lifestyle_entries", headers=headers, params=params, timeout=6)
            if r.status_code == 200:
                entries = r.json()
                for e in entries:
                    if 'ts' not in e and 'created_at' in e:
                        e['ts'] = e.get('created_at')
                return {"entries": entries, "source": "supabase"}
        except Exception:
            pass

    # Fallback to in-memory store
    entries = LIFESTYLE_STORE.get(user_id, [])[:limit]
    return {"entries": entries, "source": "memory"}

@app.get("/api/lifestyle/week/{user_id}")
def lifestyle_week(user_id: int, days: int = 7):
    """Return simple weekly aggregates (averages) for the last `days` days."""
    user_id = int(user_id)
    cutoff = datetime.utcnow() - timedelta(days=days)
    rows: List[Dict[str, Any]] = []

    # Try Supabase first
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            headers = _supabase_headers()
            params = {"user_id": f"eq.{user_id}", "order": "created_at.desc"}
            r = requests.get(f"{SUPABASE_URL}/rest/v1/lifestyle_entries", headers=headers, params=params, timeout=6)
            if r.status_code == 200:
                rows = r.json()
        except Exception:
            rows = []

    if not rows:
        rows = LIFESTYLE_STORE.get(user_id, [])

    # filter by cutoff
    filtered = []
    for r in rows:
        try:
            ts = r.get('ts') or r.get('created_at')
            dt = datetime.fromisoformat(ts)
            if dt >= cutoff:
                filtered.append(r)
        except Exception:
            continue

    if not filtered:
        return {}

    def _avg(key):
        vals = [float(x.get(key) or 0) for x in filtered if x.get(key) is not None]
        return (sum(vals) / len(vals)) if vals else None

    summary = {
        'avg_sleep': _avg('sleep_hours'),
        'avg_exercise_mins': _avg('exercise_minutes'),
        'avg_water_glasses': _avg('water_glasses'),
        'entries_count': len(filtered)
    }
    return summary

@app.get("/api/lifestyle/moods/today/{user_id}")
def moods_today(user_id: int):
    """Return mood entries for the current UTC day for the user."""
    user_id = int(user_id)
    today_utc = datetime.utcnow().date()

    # Try Supabase first
    moods = _fetch_moods_from_supabase(user_id, limit=200, since_iso=(datetime.utcnow().date().isoformat() + 'T00:00:00Z'))

    if not moods:
        # Fallback to local file
        moods = _read_local_mood_history(user_id=user_id)

    # Filter to current day
    out = []
    for m in moods:
        ts = m.get('ts') or m.get('created_at') or m.get('timestamp')
        try:
            dt = datetime.fromisoformat(ts)
            if dt.date() == today_utc:
                out.append({'emotion': m.get('emotion'), 'ts': ts, 'source': m.get('source', 'local')})
        except Exception:
            continue

    return {'moods': list(reversed(out))}  # return chronological (oldest first)

@app.get("/api/lifestyle/moods/last/{user_id}")
def moods_last(user_id: int, limit: int = Query(7, ge=1, le=100)):
    """Return last `limit` mood entries for the user."""
    user_id = int(user_id)
    moods = _fetch_moods_from_supabase(user_id, limit=limit)
    if not moods:
        moods = _read_local_mood_history(user_id=user_id)
    # normalize
    out = []
    for m in moods[:limit]:
        ts = m.get('ts') or m.get('created_at') or m.get('timestamp')
        out.append({'emotion': m.get('emotion'), 'ts': ts, 'source': m.get('source', 'local')})
    # Return chronological ascending to match mobile UI (oldest first)
    return {'moods': list(reversed(out))}

@app.get("/api/lifestyle/moods/combined-charts/{user_id}")
def moods_combined_charts(user_id: int, days: int = 7):
    """Return pie + bar chart data built from recent mood entries."""
    user_id = int(user_id)
    # fetch recent mood entries (last 30 to have enough data)
    moods = _fetch_moods_from_supabase(user_id, limit=200)
    if not moods:
        moods = _read_local_mood_history(user_id=user_id)

    # If still no moods, return empty pie_data (bar_data removed)
    if not moods:
        return {'pie_data': [], 'source': 'none'}

    # Build pie counts (capitalize names to match frontend palette)
    counts: Dict[str, int] = {}
    for m in moods:
        name = str(m.get('emotion') or 'Other').strip()
        key = name.capitalize()
        counts[key] = counts.get(key, 0) + 1

    palette = {
        'Happy': '#4CAF50', 'Sad': '#2196F3', 'Angry': '#F44336', 'Neutral': '#9E9E9E',
        'Fear': '#9C27B0', 'Surprised': '#FF9800', 'Disgust': '#795548', 'Excited': '#FFEB3B', 'Other': '#FFB74D'
    }

    pie = [{
        'name': name,
        'population': count,
        'color': palette.get(name, '#cccccc'),
        'legendFontColor': '#333',
        'legendFontSize': 12
    } for name, count in sorted(counts.items(), key=lambda x: -x[1])]

    # bar_data removed (frontend no longer displays weekly bar chart)
    return {'pie_data': pie, 'source': 'supabase' if SUPABASE_URL else 'local'}

@app.get("/api/demo/combined-charts/{user_id}")
def demo_combined_charts(user_id: int):
    """Return deterministic demo data used by the mobile app when no real mood data exists."""
    demo_pie = [
        {'name': 'Happy', 'population': 3, 'color': '#4CAF50', 'legendFontColor': '#333', 'legendFontSize': 12},
        {'name': 'Neutral', 'population': 2, 'color': '#9E9E9E', 'legendFontColor': '#333', 'legendFontSize': 12},
        {'name': 'Sad', 'population': 1, 'color': '#2196F3', 'legendFontColor': '#333', 'legendFontSize': 12}
    ]
    # demo returns pie data only (bar_data removed)
    return {'pie_data': demo_pie, 'source': 'demo'}

if __name__ == '__main__':
    import uvicorn
    print("▶️ Starting Lifestyle Service on port 8005")
    uvicorn.run(app, host='0.0.0.0', port=8005)
