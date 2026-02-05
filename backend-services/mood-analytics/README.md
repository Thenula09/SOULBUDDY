# 📊 SoulBuddy Mood Analytics Service

Mood tracking, analysis, and pattern recognition microservice.

## 🎯 Purpose

Handles mood entry logging, historical data, analytics, and trend analysis.

## 🚀 Features

- ✅ Mood logging with 5-level scale
- ✅ Activity tracking (sleep, exercise, social, work)
- ✅ Historical mood data retrieval
- ✅ Mood pattern analysis
- ✅ Trend detection (improving/declining/stable)
- ✅ Comprehensive mood reports
- ✅ Activity correlation analysis
- ✅ Automatic API documentation

## 🛠️ Tech Stack

- **Python** 3.9+
- **FastAPI** - Web framework
- **Pydantic** - Data validation
- **Uvicorn** - ASGI server

## 📦 Installation

### 1. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Run Service

```bash
python main.py
```

Service will start on **http://localhost:8003**

## 📝 API Endpoints

### Health Check
```
GET  /              - Root endpoint
GET  /health        - Health check
```

### Mood Logging
```
POST   /api/mood/log                - Log mood entry
GET    /api/mood/{user_id}          - Get mood history
GET    /api/mood/latest/{user_id}   - Get latest mood
DELETE /api/mood/{entry_id}         - Delete mood entry
```

### Analytics
```
GET /api/mood/analytics/{user_id}  - Get mood analytics
GET /api/mood/trends/{user_id}     - Get mood trends
GET /api/mood/report/{user_id}     - Generate full report
```

## 📖 API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8003/docs
- **ReDoc**: http://localhost:8003/redoc

## 🧪 Testing

### Log Mood Entry
```bash
curl -X POST "http://localhost:8003/api/mood/log" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "mood_level": 4,
    "mood_type": "happy",
    "notes": "Had a great day!",
    "activities": ["exercise", "social"]
  }'
```

### Get Mood History
```bash
curl -X GET "http://localhost:8003/api/mood/1?limit=10"
```

### Get Analytics
```bash
curl -X GET "http://localhost:8003/api/mood/analytics/1"
```

### Get Trends
```bash
curl -X GET "http://localhost:8003/api/mood/trends/1?days=30"
```

## 📊 Mood Scale

- **5** - Very Happy
- **4** - Happy
- **3** - Neutral
- **2** - Sad
- **1** - Very Sad

## 🎭 Mood Types

- `happy` - Joyful, excited
- `sad` - Down, depressed
- `anxious` - Worried, stressed
- `angry` - Frustrated, upset
- `neutral` - Balanced, calm

## 🏃 Activities Tracked

- `sleep` - Sleep quality/duration
- `exercise` - Physical activity
- `social` - Social interactions
- `work` - Work/productivity
- `meditation` - Mindfulness
- `hobbies` - Personal interests

## 📈 Analytics Features

### Mood Distribution
Shows percentage of each mood type

### Trend Analysis
- **Improving** - Mood trending upward
- **Declining** - Mood trending downward
- **Stable** - Consistent mood
- **Insufficient Data** - Need more entries

### Activity Correlation
Identifies which activities correlate with better/worse moods

## 📊 Response Examples

### Mood Entry Response
```json
{
  "id": 1,
  "user_id": 1,
  "mood_level": 4,
  "mood_type": "happy",
  "notes": "Had a great day!",
  "activities": ["exercise", "social"],
  "timestamp": "2026-02-06T10:30:00"
}
```

### Analytics Response
```json
{
  "user_id": 1,
  "total_entries": 45,
  "average_mood": 3.8,
  "most_common_mood": "happy",
  "mood_distribution": {
    "happy": 20,
    "neutral": 15,
    "sad": 10
  },
  "recent_trend": "improving"
}
```

## 🗄️ Database

Currently uses **in-memory storage**.

For production:
- Integrate PostgreSQL (Supabase)
- Create mood_entries table
- Add indexes for performance
- Implement data retention policies

## 🔄 Integration

Integrates with:
- **User Service** - User validation
- **Mobile App** - Mood logging interface
- **API Gateway** - Request routing

## 🚢 Deployment

### Docker
```bash
docker build -t soulbuddy-mood-analytics .
docker run -p 8003:8003 soulbuddy-mood-analytics
```

### Cloud Platforms
- AWS, Google Cloud, Azure, Heroku

## 📞 Support

For issues, contact the SoulBuddy development team.

---

**Part of SoulBuddy Platform** | [Main Repository](https://github.com/Thenula09/SOULBUDDY)
