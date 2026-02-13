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
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
import uvicorn
import os
import requests

app = FastAPI(title="Lifestyle Service", version="0.2.0")

# In-memory store for manual entries: { user_id: [entries...] }
_STORE: Dict[int, List[Dict[str, Any]]] = {}

# Supabase configuration (optional)
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

def _supabase_headers():
    return {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"} if SUPABASE_KEY else {}

class LifestyleEntry(BaseModel):
    user_id: int
    ts: Optional[str] = None
    sleep_hours: Optional[float] = None
    exercise_minutes: Optional[int] = None
    water_glasses: Optional[int] = None
    notes: Optional[str] = None

@app.get("/health")
async def health():
    return {"service": "lifestyle-service", "status": "ok"}

@app.post("/api/lifestyle/log")
async def log_entry(entry: LifestyleEntry, request: Request):
    """Persist a lifestyle entry.
    - If Supabase is configured the entry will be inserted there (table: `lifestyle_entries`).
    - Otherwise falls back to the in-memory `_STORE`.
    """
    uid = int(entry.user_id)
    rec = entry.dict()
    rec["ts"] = rec.get("ts") or datetime.utcnow().isoformat()

    # Try Supabase first (if configured)
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            # Supabase REST: return representation so we get the stored row
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
                return {"ok": True, "saved": saved, "source": "supabase"}
            else:
                print("Supabase insert failed:", resp.status_code, resp.text)
        except Exception as e:
            print("Supabase insert error:", e)

    # Fallback: keep in-memory for local/dev
    _STORE.setdefault(uid, []).append(rec)
    return {"ok": True, "saved": rec, "source": "memory"}

@app.get("/api/lifestyle/{user_id}")
async def get_entries(user_id: int):
    """Return lifestyle entries for a user.
    - If Supabase is configured, read from `lifestyle_entries` table.
    - Otherwise return the in-memory store.
    """
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

@app.get("/api/lifestyle/week/{user_id}")
async def get_week(user_id: int):
    # existing behavior: aggregate from in-memory _STORE and return summary
    now = datetime.utcnow()
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
