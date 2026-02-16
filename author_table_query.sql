-- Author Table for SOULBUDDY
-- ==========================

-- 1. CREATE TABLE for authors (if not exists)
CREATE TABLE IF NOT EXISTS public.authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint,                                          -- Link to users table (optional)
  name varchar(100) NOT NULL,                              -- Author name
  bio text,                                                -- Author biography
  avatar_url varchar(500),                                 -- Profile photo URL
  email varchar(255),                                      -- Contact email
  social_links jsonb,                                     -- Social media links (Twitter, Instagram, etc.)
  expertise jsonb,                                        -- Areas of expertise (mental health, wellness, etc.)
  is_active boolean DEFAULT true,                         -- Whether author is active
  is_verified boolean DEFAULT false,                      -- Verification status
  total_articles integer DEFAULT 0,                       -- Number of articles written
  total_followers integer DEFAULT 0,                      -- Follower count
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. CREATE INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_authors_user_id ON public.authors (user_id);
CREATE INDEX IF NOT EXISTS idx_authors_name ON public.authors (name);
CREATE INDEX IF NOT EXISTS idx_authors_is_active ON public.authors (is_active);
CREATE INDEX IF NOT EXISTS idx_authors_is_verified ON public.authors (is_verified);
CREATE INDEX IF NOT EXISTS idx_authors_created_at ON public.authors (created_at DESC);

-- 3. Trigger for updated_at
DROP TRIGGER IF EXISTS set_timestamp ON public.authors;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.authors
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- 4. SAMPLE QUERIES
-- =================

-- Insert sample author
INSERT INTO public.authors (name, bio, email, expertise, is_verified)
VALUES (
  'Dr. Sarah Johnson',
  'Mental health and wellness expert with 15 years of experience in cognitive behavioral therapy.',
  'sarah@soulbuddy.com',
  '["mental health", "meditation", "stress management", "cognitive behavioral therapy"]',
  true
);

-- Get all active authors
SELECT 
  id,
  name,
  bio,
  avatar_url,
  email,
  social_links,
  expertise,
  is_verified,
  total_articles,
  total_followers,
  created_at
FROM public.authors 
WHERE is_active = true 
ORDER BY total_followers DESC, created_at DESC;

-- Get author by ID
SELECT * FROM public.authors WHERE id = 'author-uuid-here';

-- Get author by user_id (linked to users table)
SELECT * FROM public.authors WHERE user_id = 1;

-- Update author profile
UPDATE public.authors 
SET 
  bio = 'Updated bio text',
  social_links = '{"twitter": "https://twitter.com/author", "linkedin": "https://linkedin.com/in/author"}',
  updated_at = now()
WHERE id = 'author-uuid-here';

-- Increment article count
UPDATE public.authors 
SET total_articles = total_articles + 1 
WHERE id = 'author-uuid-here';

-- Search authors by name
SELECT * FROM public.authors 
WHERE name ILIKE '%johnson%' 
AND is_active = true;

-- Get verified authors only
SELECT name, bio, avatar_url, expertise, total_articles, total_followers
FROM public.authors 
WHERE is_verified = true 
AND is_active = true
ORDER BY total_followers DESC;

-- 5. RLS POLICIES (Row Level Security)
-- =====================================
-- Uncomment these if you want to enable RLS

-- ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;

-- Anyone can view active authors
-- CREATE POLICY "Anyone can view active authors" ON public.authors
--   FOR SELECT USING (is_active = true);

-- Only admins can insert/update/delete
-- CREATE POLICY "Admins can manage authors" ON public.authors
--   FOR ALL USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin');

-- 6. FOREIGN KEY (optional - link to users table)
-- ALTER TABLE public.authors 
-- ADD CONSTRAINT fk_authors_user_id 
-- FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

