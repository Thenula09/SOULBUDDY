// Supabase client for React Native
// NOTE: replace the placeholders below with your Supabase project URL and anon key.
// Do NOT commit real keys to a public repo.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kwatlajonuscyrfobzfq.supabase.co'; // <- replace if needed
const SUPABASE_ANON_KEY = 'REPLACE_WITH_YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
