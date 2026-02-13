# 🗄️ Mood Tracking Database Setup Guide

This guide explains how to set up the complete mood tracking system with Supabase integration.

## 📋 Overview

The mood tracking system saves emotions detected from:
- 📸 **Photo analysis** - When user shares a photo in chat
- 💬 **Chat messages** - When AI detects emotion from conversation

All moods are tracked with 5-minute intervals for mood history context.

---

## 🚀 Setup Instructions

### Step 1: Create Supabase Database Table

1. Go to your **Supabase Dashboard** → SQL Editor
2. Run the following SQL query:

```sql
-- Create mood_history table for tracking emotions
CREATE TABLE mood_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id INTEGER NOT NULL,
  emotion TEXT NOT NULL,
  confidence FLOAT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('photo', 'chat')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast queries by user and time
CREATE INDEX idx_mood_user_time ON mood_history(user_id, created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE mood_history IS 'Tracks user emotions detected from photos and chat';
COMMENT ON COLUMN mood_history.emotion IS 'Detected emotion: Happy, Sad, Angry, Stressed, Neutral, etc.';
COMMENT ON COLUMN mood_history.confidence IS 'Confidence score (0.0 to 1.0)';
COMMENT ON COLUMN mood_history.source IS 'Detection source: photo or chat';
```

3. Click **Run** to execute the query

### Step 2: Configure Environment Variables

1. **Copy the example file:**
   ```bash
   cd /Users/thenulahansaja/Documents/SOULBUDDY/backend-services/chat-ai-service
   cp .env.example .env
   ```

2. **Edit `.env` file with your Supabase credentials:**
   ```bash
   nano .env
   ```

3. **Update these values:**
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your_supabase_anon_key_here
   ```

   **Where to find these:**
   - Go to Supabase Dashboard → Settings → API
   - Copy **Project URL** → Use as `SUPABASE_URL`
   - Copy **anon/public key** → Use as `SUPABASE_KEY`

### Step 3: Restart Chat AI Service

```bash
# Stop current service
pkill -9 -f "chat-ai-service/main.py"

# Wait a moment
sleep 2

# Start with updated code
cd /Users/thenulahansaja/Documents/SOULBUDDY/backend-services/chat-ai-service
/Users/thenulahansaja/Documents/SOULBUDDY/deepface-env/bin/python main.py
```

---

## 📊 How It Works

### Photo Emotion Detection Flow
1. User captures photo in mobile app
2. Photo sent to `/analyze-photo-emotion` endpoint (with user_id)
3. DeepFace analyzes facial emotion
4. **Mood saved to database** with source="photo"
5. Bot replies with empathetic message

### Chat Emotion Detection Flow
1. User sends chat message
2. Message sent to `/chat` endpoint (with user_id)
3. Groq AI detects emotion from text
4. **Recent mood fetched** (last 5 minutes) for context
5. **New mood saved to database** with source="chat"
6. Bot replies with emotion-aware response

### Mood History Context (5-minute tracking)
- Before responding to chat, AI fetches user's recent mood (last 5 min)
- If mood exists, adds context: *"User's recent emotion: Happy (from photo)"*
- This helps AI provide more relevant and empathetic responses

---

## 🧪 Testing the System

### Test Photo Mood Tracking
1. Open mobile app on Android emulator
2. Take a photo in chat (tap camera icon)
3. Check backend logs: Should see `✅ Mood saved to database`
4. Verify in Supabase: Go to Table Editor → mood_history → Should see new row with source="photo"

### Test Chat Mood Tracking
1. Send a chat message expressing emotion: *"I'm feeling really happy today!"*
2. Check backend logs: Should see mood saved message
3. Send another message within 5 minutes
4. Check logs: Should see *"User's recent emotion: Happy (from chat)"*
5. Verify in Supabase: Should see multiple rows with source="chat"

### Verify 5-Minute Tracking
1. Save a mood (photo or chat)
2. Wait 5 minutes
3. Send another message
4. Recent mood should NOT be fetched (older than 5 minutes)
5. New mood gets saved independently

---

## 📝 Database Schema

### mood_history Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| user_id | INTEGER | User ID from user_service |
| emotion | TEXT | Detected emotion (Happy, Sad, Angry, Stressed, Neutral) |
| confidence | FLOAT | Confidence score (0.0 to 1.0) |
| source | TEXT | Detection source: 'photo' or 'chat' |
| created_at | TIMESTAMP | When mood was recorded (UTC) |

---

## 🔍 Useful SQL Queries

### View Recent Moods for a User
```sql
SELECT * FROM mood_history
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 10;
```

### View Moods from Last 5 Minutes
```sql
SELECT * FROM mood_history
WHERE user_id = 1
  AND created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

### Count Moods by Source
```sql
SELECT source, COUNT(*) as count
FROM mood_history
WHERE user_id = 1
GROUP BY source;
```

### View Mood Timeline (Last 24 Hours)
```sql
SELECT 
  created_at,
  emotion,
  source,
  confidence
FROM mood_history
WHERE user_id = 1
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## 🚨 Troubleshooting

### Issue: "Failed to save mood to database"
**Cause:** Missing or incorrect Supabase credentials

**Solution:**
1. Check `.env` file exists in chat-ai-service folder
2. Verify SUPABASE_URL and SUPABASE_KEY are correct
3. Test Supabase connection:
   ```bash
   curl https://your-project-id.supabase.co/rest/v1/mood_history \
     -H "apikey: your_supabase_key"
   ```

### Issue: "Table mood_history does not exist"
**Cause:** SQL table not created

**Solution:**
1. Go to Supabase Dashboard → SQL Editor
2. Run the CREATE TABLE query from Step 1
3. Verify table exists: Table Editor → mood_history

### Issue: Mood not saving from photo
**Cause:** Frontend not sending user_id

**Solution:**
1. Check ChatScreen.tsx sends user_id in FormData
2. Update photo capture code:
   ```typescript
   formData.append('user_id', userStore.user?.id?.toString() || '');
   ```

### Issue: Recent mood not showing in context
**Cause:** Time difference or no mood within 5 minutes

**Solution:**
1. Check system time is correct
2. Verify mood was saved within last 5 minutes
3. Check backend logs for "User's recent emotion" message

---

## 📱 Frontend Integration (Optional Update)

To send user_id with photo analysis, update ChatScreen.tsx:

```typescript
// Add user_id to FormData
const formData = new FormData();
formData.append('file', {
  uri: response.assets[0].uri,
  type: response.assets[0].type || 'image/jpeg',
  name: response.assets[0].fileName || 'photo.jpg',
} as any);

// Add user_id if available
if (userStore.user?.id) {
  formData.append('user_id', userStore.user.id.toString());
}
```

---

## ✅ Success Checklist

- [ ] SQL table created in Supabase
- [ ] `.env` file configured with correct credentials
- [ ] Chat AI service restarted with updated code
- [ ] Photo mood tracking tested and working
- [ ] Chat mood tracking tested and working
- [ ] 5-minute mood history verified
- [ ] Database shows correct records in mood_history table

---

## 📞 Support

If you encounter issues:
1. Check backend logs for error messages
2. Verify Supabase credentials in `.env`
3. Test database connection with curl command
4. Check mobile app network connectivity

**Logs Location:** Terminal where chat-ai-service is running
**Database:** Supabase Dashboard → Table Editor → mood_history
