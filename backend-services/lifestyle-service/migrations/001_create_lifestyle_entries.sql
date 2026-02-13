-- 001_create_lifestyle_entries.sql
-- Migration: create `lifestyle_entries` table for Supabase/Postgres
-- Run with psql or Supabase SQL editor (https://app.supabase.io)

-- NOTE: adjust `user_id` type and RLS policy to match your auth / users schema.

BEGIN;

-- Create table
CREATE TABLE IF NOT EXISTS public.lifestyle_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL,
  ts timestamptz NOT NULL DEFAULT now(),            -- timestamp for the recorded event (UTC)
  sleep_hours numeric(4,2),                        -- e.g. 7.25
  exercise_minutes integer,                         -- minutes of exercise
  water_glasses integer,                            -- number of glasses of water
  notes text,
  meta jsonb DEFAULT '{}'::jsonb,                   -- free-form metadata / device flags
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_lifestyle_user_id ON public.lifestyle_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_lifestyle_created_at ON public.lifestyle_entries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lifestyle_user_created_at ON public.lifestyle_entries (user_id, created_at DESC);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_timestamp ON public.lifestyle_entries;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.lifestyle_entries
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

COMMIT;

-- === OPTIONAL: Row Level Security (RLS) example ===
-- The application must adapt these policies to the authentication claims used by your Supabase/JWT.
-- If `user_id` is a numeric id from your `profiles` table, adapt the CHECK/USING expressions accordingly.

-- ENABLE RLS (uncomment to enable once policies are in place):
-- ALTER TABLE public.lifestyle_entries ENABLE ROW LEVEL SECURITY;

-- Example policy (AUTHENTICATED users can insert rows where `user_id` matches their claim):
-- NOTE: Replace `auth.jwt() ->> 'sub'` / claim name depending on your JWT contents.
--
-- CREATE POLICY "Insert own lifestyle entries" ON public.lifestyle_entries
--   FOR INSERT
--   WITH CHECK ((auth.jwt() ->> 'user_id')::bigint = user_id OR auth.role() = 'service_role');
--
-- CREATE POLICY "Select own lifestyle entries" ON public.lifestyle_entries
--   FOR SELECT USING ((auth.jwt() ->> 'user_id')::bigint = user_id OR auth.role() = 'service_role');
--
-- CREATE POLICY "Update own lifestyle entries" ON public.lifestyle_entries
--   FOR UPDATE USING ((auth.jwt() ->> 'user_id')::bigint = user_id OR auth.role() = 'service_role')
--   WITH CHECK ((auth.jwt() ->> 'user_id')::bigint = user_id OR auth.role() = 'service_role');

-- === Helpful example queries ===
-- Insert (example):
-- INSERT INTO public.lifestyle_entries (user_id, ts, sleep_hours, exercise_minutes, water_glasses, notes)
-- VALUES (1, now(), 7.5, 30, 6, 'Slept well');

-- Last 7 entries for user 1:
-- SELECT * FROM public.lifestyle_entries WHERE user_id = 1 ORDER BY created_at DESC LIMIT 7;

-- Today's entries:
-- SELECT * FROM public.lifestyle_entries WHERE user_id = 1 AND ts >= date_trunc('day', now() AT TIME ZONE 'UTC') ORDER BY ts ASC;
