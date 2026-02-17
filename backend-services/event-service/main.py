"""
Simple Event Service (port 8006)
- POST /api/events        -> create an event
- GET  /api/events/{user} -> list events for a user (optional ?date=YYYY-MM-DD)

Uses a local SQLite DB by default (or DATABASE_URL if provided).
"""
import os
from datetime import datetime, date
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Date, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine
from dotenv import load_dotenv
import requests

load_dotenv()

# Optional Supabase configuration (if present, service will use Supabase REST as primary store)
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_KEY)
if USE_SUPABASE:
    print('▶ Event service: Supabase integration ENABLED (using REST)')
else:
    print('▶ Event service: Supabase integration DISABLED — using local DB')

DATABASE_URL = os.getenv('DATABASE_URL') or f"sqlite:///{os.path.join(os.path.dirname(__file__), 'events.db')}"
# Use SQLite by default for ease of local development
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith('sqlite') else {})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

# Log DB backend for clarity
print(f"▶ Event service DB backend: {'sqlite' if DATABASE_URL.startswith('sqlite') else 'postgres'}")

class Event(Base):
    __tablename__ = 'events'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    date = Column(Date, index=True, nullable=False)
    title = Column(String(512), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

app = FastAPI(title='SoulBuddy Event Service', version='0.1.0')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])

class EventIn(BaseModel):
    user_id: int
    date: str  # YYYY-MM-DD
    title: str

class EventOut(BaseModel):
    id: str
    user_id: int
    date: str
    title: str
    created_at: str

@app.get('/')
def root():
    return {'service': 'event-service', 'version': '0.1.0', 'status': 'running'}

@app.get('/health')
def health():
    return {'status': 'healthy'}

@app.post('/api/events', response_model=EventOut)
def create_event(payload: EventIn):
    # validate date
    try:
        d = datetime.fromisoformat(payload.date).date()
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid date format; use YYYY-MM-DD')

    # If Supabase configured, try to persist there first
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/calendar_events"
            headers = {
                'apikey': SUPABASE_KEY,
                'Authorization': f'Bearer {SUPABASE_KEY}',
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
            payload_json = { 'user_id': payload.user_id, 'title': payload.title, 'event_date': payload.date }
            resp = requests.post(url, json=payload_json, headers=headers, timeout=8)
            if resp.status_code in (200, 201):
                body = resp.json()
                # Supabase returns an array of inserted rows
                row = body[0] if isinstance(body, list) and body else body
                return {
                    'id': str(row.get('id')),
                    'user_id': int(row.get('user_id')),
                    'date': row.get('event_date'),
                    'title': row.get('title'),
                    'created_at': row.get('created_at')
                }
            else:
                print(f"⚠️ Supabase insert failed: {resp.status_code} {resp.text}")
        except Exception as e:
            print(f"⚠️ Supabase insert error: {e}")
            # fall back to local DB

    # Fallback/local SQLite (keeps existing behavior)
    db = SessionLocal()
    ev = Event(user_id=payload.user_id, date=d, title=payload.title)
    db.add(ev)
    db.commit()
    db.refresh(ev)
    db.close()

    return {
        'id': str(ev.id),
        'user_id': ev.user_id,
        'date': ev.date.isoformat(),
        'title': ev.title,
        'created_at': ev.created_at.isoformat()
    }

@app.get('/api/events/{user_id}', response_model=List[EventOut])
def list_events(user_id: int, date: Optional[str] = Query(None)):
    # If Supabase configured, query Supabase via REST
    if USE_SUPABASE:
        try:
            headers = {
                'apikey': SUPABASE_KEY,
                'Authorization': f'Bearer {SUPABASE_KEY}'
            }
            url = f"{SUPABASE_URL}/rest/v1/calendar_events?user_id=eq.{user_id}"
            if date:
                # validate date
                try:
                    _ = datetime.fromisoformat(date).date()
                except Exception:
                    raise HTTPException(status_code=400, detail='Invalid date format; use YYYY-MM-DD')
                url += f"&event_date=eq.{date}"
            url += "&order=event_date.asc,created_at.asc"
            resp = requests.get(url, headers=headers, timeout=6)
            if resp.status_code == 200:
                body = resp.json()
                return [
                    {
                        'id': str(r.get('id')),
                        'user_id': int(r.get('user_id')),
                        'date': r.get('event_date'),
                        'title': r.get('title'),
                        'created_at': r.get('created_at')
                    }
                    for r in body
                ]
            else:
                print(f"⚠️ Supabase fetch failed: {resp.status_code} {resp.text}")
        except Exception as e:
            print(f"⚠️ Supabase fetch error: {e}")
            # fall back to local DB

    # Fallback/local SQLite
    db = SessionLocal()
    q = db.query(Event).filter(Event.user_id == user_id)
    if date:
        try:
            d = datetime.fromisoformat(date).date()
            q = q.filter(Event.date == d)
        except Exception:
            db.close()
            raise HTTPException(status_code=400, detail='Invalid date format; use YYYY-MM-DD')
    rows = q.order_by(Event.date.asc(), Event.created_at.asc()).all()
    out = [
        {
            'id': str(r.id),
            'user_id': r.user_id,
            'date': r.date.isoformat(),
            'title': r.title,
            'created_at': r.created_at.isoformat()
        }
        for r in rows
    ]
    db.close()
    return out

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=int(os.getenv('PORT', '8006')))
