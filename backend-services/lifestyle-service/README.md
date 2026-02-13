# Lifestyle Service (prototype)

Lightweight FastAPI service for storing simple lifestyle entries (sleep, exercise, hydration).

Endpoints:
- GET  /health
- POST /api/lifestyle/log
- GET  /api/lifestyle/{user_id}
- GET  /api/lifestyle/week/{user_id}

This service uses an in-memory store for local development. For production, replace with persistent storage (Postgres, Supabase, etc.).