// Browser Supabase client. Uses ONLY the public anon key — never the service key.
// RLS policies in supabase/schema.sql enforce what anon/authenticated can do.
//
// If env keys are missing (fresh clone, no .env.local yet), a placeholder
// client is returned and a warning is logged — the UI then shows a friendly
// "not connected" message instead of crashing with a Runtime Error overlay.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;
let warned = false;

export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
  if (!isSupabaseConfigured() && !warned && typeof window !== 'undefined') {
    warned = true;
    console.warn(
      'Supabase is not configured. Copy .env.example to .env.local and fill NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  cached = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return cached;
}
