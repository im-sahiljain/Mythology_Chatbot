import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ [Supabase Client Warning] EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY is missing in frontend/.env!');
} else {
  console.log(`🔐 [Supabase Client Initialized] Connected to URL: ${supabaseUrl}`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);