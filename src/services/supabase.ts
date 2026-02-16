// Supabase client for React Native
// NOTE: replace the placeholders below with your Supabase project URL and anon key.
// Do NOT commit real keys to a public repo.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kwatlajonuscyrfobzfq.supabase.co'; // <- replace if needed
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3YXRsYWpvbnVzY3lyZm9iemZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NzkzMzAsImV4cCI6MjA4NjM1NTMzMH0.3Um_uJRCV2zJas4D_Jay6VmramPbvCRp3dZOvi1otH8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
