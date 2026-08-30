import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase browser client.
 *
 * Use this in Client Components ('use client') for:
 *   - supabase.auth.signInWithPassword(...)
 *   - supabase.auth.signUp(...)
 *   - supabase.auth.signInWithOAuth(...)
 *   - supabase.auth.signOut()
 *   - supabase.auth.onAuthStateChange(...)
 *
 * The URL is hardcoded from the linked project ref (alvrzmwhuomepqmyalfo).
 * The anon key must be exposed to the browser (NEXT_PUBLIC_*) - it is safe to
 * ship to the client as long as Row Level Security (RLS) is enabled on every
 * table, which is the default for new Supabase projects.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
