-- User Mood Table Queries for SOULBUDDY
-- =====================================

-- 1. CREATE TABLE for user_moods (if not exists)
CREATE TABLE IF NOT EXISTS public.user_moods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL,
  emotion varchar(50) NOT NULL,                    -- happy, sad, angry, fear, surprised, disgust, neutral
  confidence numeric(3,2),                         -- 0.00 to 1.00 (confidence score)
  source varchar(50) DEFAULT 'manual',             -- photo, text, manual, test
  ai_response text,                                -- AI-generated response based on mood
  all_emotions jsonb,                              -- Full emotion analysis results
  face_detected boolean,                           -- Whether face was detected in photo
  color_suggestions jsonb,                         -- Color therapy suggestions
  mood_trend varchar(100),                         -- Trend analysis
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. CREATE INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_user_moods_user_id ON public.user_moods (user_id);
CREATE INDEX IF NOT EXISTS idx_user_moods_created_at ON public.user_moods (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_moods_user_created_at ON public.user_moods (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_moods_emotion ON public.user_moods (emotion);

-- 3. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_timestamp ON public.user_moods;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.user_moods
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- 4. SAMPLE QUERIES
-- =================

-- Insert sample mood entry
INSERT INTO public.user_moods (user_id, emotion, confidence, source, ai_response)
VALUES (1, 'happy', 0.85, 'photo', 'Great to see you feeling happy! Keep up the positive energy!');

-- Get all moods for a specific user
SELECT 
  id,
  user_id,
  emotion,
  confidence,
  source,
  created_at,
  updated_at
FROM public.user_moods 
WHERE user_id = 1 
ORDER BY created_at DESC;

-- Get mood history for last 7 days
SELECT 
  emotion,
  confidence,
  source,
  created_at
FROM public.user_moods 
WHERE user_id = 1 
  AND created_at >= now() - interval '7 days'
ORDER BY created_at DESC;

-- Get mood distribution for a user
SELECT 
  emotion,
  COUNT(*) as mood_count,
  ROUND(AVG(confidence), 2) as avg_confidence,
  MAX(created_at) as last_occurrence
FROM public.user_moods 
WHERE user_id = 1 
GROUP BY emotion 
ORDER BY mood_count DESC;

-- Get today's moods
SELECT 
  emotion,
  confidence,
  source,
  created_at
FROM public.user_moods 
WHERE user_id = 1 
  AND DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

-- Get mood trend analysis
SELECT 
  DATE(created_at) as mood_date,
  emotion,
  confidence,
  source,
  LAG(emotion) OVER (ORDER BY created_at) as previous_emotion
FROM public.user_moods 
WHERE user_id = 1 
  AND created_at >= now() - interval '30 days'
ORDER BY created_at DESC;

-- Get mood statistics for dashboard
SELECT 
  COUNT(*) as total_moods,
  COUNT(DISTINCT emotion) as unique_emotions,
  ROUND(AVG(confidence), 2) as avg_confidence,
  MAX(confidence) as highest_confidence,
  MIN(confidence) as lowest_confidence,
  MAX(created_at) as last_mood_time
FROM public.user_moods 
WHERE user_id = 1;

-- Get moods by source
SELECT 
  source,
  COUNT(*) as count,
  ROUND(AVG(confidence), 2) as avg_confidence
FROM public.user_moods 
WHERE user_id = 1 
GROUP BY source 
ORDER BY count DESC;

-- Get mood entries with AI responses
SELECT 
  emotion,
  confidence,
  ai_response,
  created_at
FROM public.user_moods 
WHERE user_id = 1 
  AND ai_response IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- 5. CLEANUP QUERIES
-- ==================

-- Delete old mood entries (older than 90 days)
DELETE FROM public.user_moods 
WHERE created_at < now() - interval '90 days';

-- Get mood count by user (for admin)
SELECT 
  user_id,
  COUNT(*) as mood_entries,
  MIN(created_at) as first_mood,
  MAX(created_at) as last_mood
FROM public.user_moods 
GROUP BY user_id 
ORDER BY mood_entries DESC;

-- 6. BACKUP TABLE CREATION (mood_history - legacy support)
CREATE TABLE IF NOT EXISTS public.mood_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL,
  emotion varchar(50) NOT NULL,
  confidence numeric(3,2),
  source varchar(50) DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for mood_history
CREATE INDEX IF NOT EXISTS idx_mood_history_user_id ON public.mood_history (user_id);
CREATE INDEX IF NOT EXISTS idx_mood_history_created_at ON public.mood_history (created_at DESC);

-- 7. RLS POLICIES (Row Level Security)
-- =====================================
-- Uncomment these if you want to enable RLS

-- ALTER TABLE public.user_moods ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view own moods" ON public.user_moods
--   FOR SELECT USING ((auth.jwt() ->> 'user_id')::bigint = user_id OR auth.role() = 'service_role');

-- CREATE POLICY "Users can insert own moods" ON public.user_moods
--   FOR INSERT WITH CHECK ((auth.jwt() ->> 'user_id')::bigint = user_id OR auth.role() = 'service_role');

-- CREATE POLICY "Users can update own moods" ON public.user_moods
--   FOR UPDATE USING ((auth.jwt() ->> 'user_id')::bigint = user_id OR auth.role() = 'service_role')
--   WITH CHECK ((auth.jwt() ->> 'user_id')::bigint = user_id OR auth.role() = 'service_role');
