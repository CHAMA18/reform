import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase server client.
 *
 * Use this in Server Components, Route Handlers, and Server Actions for:
 *   - Reading the current session (protected routes)
 *   - supabase.auth.getUser()
 *   - supabase.auth.signOut() (server-side)
 *   - Any privileged DB reads that should run with the user's RLS context
 *
 * NEVER use the service role key here. The service role key bypasses RLS and
 * must only be used in secure server-only contexts (webhooks, cron jobs).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
