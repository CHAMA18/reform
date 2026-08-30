import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Next.js proxy entry point (formerly "middleware" in Next.js 15 and earlier).
 *
 * Delegates to the Supabase session-refresh proxy.
 *
 * The matcher excludes static assets, Next.js internals, and image files so
 * the proxy only runs on actual page/API routes.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - .*\\.(png|svg|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|css|js|map)$
     *   (other static assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|css|js|map)$).*)',
  ],
};
