import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * OAuth / email-verification callback.
 *
 * Supabase redirects here with a `code` query param after:
 *   - The user clicks the email verification link (sign-up confirmation)
 *   - The user completes an OAuth flow (GitHub, Google)
 *
 * We exchange the code for a session (which sets the auth cookies), then
 * redirect to the `next` query param (defaults to /dashboard).
 *
 * If anything goes wrong we send the user to /signin with an error message
 * so they're never stuck on a blank callback page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/dashboard';

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      // Fall through to the error redirect
    } catch {
      // Supabase misconfigured / unreachable — fall through to error redirect.
    }
  }

  const redirectUrl = new URL('/signin', origin);
  redirectUrl.searchParams.set('error', 'auth_callback_failed');
  return NextResponse.redirect(redirectUrl);
}
