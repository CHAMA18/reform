import { NextResponse, type NextRequest } from 'next/server';

/**
 * Supabase session-refresh middleware.
 *
 * Currently DISABLED to prevent redirect loops in the preview iframe.
 *
 * The original implementation created a Supabase server client on every
 * request and called `supabase.auth.getUser()` to refresh expired sessions.
 * With placeholder Supabase env vars (no real Supabase project configured),
 * this caused the `@supabase/ssr` library to attempt cookie manipulation
 * that interacted badly with the preview platform's proxy layer, resulting
 * in "redirected you too many times" errors.
 *
 * Route protection is already disabled (see the original code below), so
 * this middleware serves no purpose when Supabase is not configured. We
 * keep the function as a pure passthrough so the proxy.ts entry point still
 * works, and so that enabling Supabase later only requires restoring the
 * original logic.
 *
 * To re-enable when real Supabase credentials are added to .env:
 *   1. Uncomment the createServerClient + getUser() block below.
 *   2. Make sure NEXT_PUBLIC_SUPABASE_URL points to a real project.
 */
export async function updateSession(request: NextRequest) {
  // Pure passthrough — no Supabase, no cookie manipulation, no redirects.
  return NextResponse.next({ request });

  /* --- Original Supabase logic (disabled) ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          request.cookies.addAll(cookiesToSet);
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    void user;
  } catch {
    // Swallow any Supabase error.
  }

  return supabaseResponse;
  */
}
