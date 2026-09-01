import type { NextRequest } from 'next/server';

/**
 * Resolve the public origin (scheme://host[:port]) for the given request.
 *
 * Why this exists:
 *   On PaaS providers like Render, the Node server binds to an internal
 *   address (e.g. `0.0.0.0:10000`) and a reverse proxy forwards public
 *   HTTPS requests to it. `new URL(request.url).origin` returns the
 *   INTERNAL address (`https://0.0.0.0:10000`), which the browser cannot
 *   reach — so any `NextResponse.redirect()` built from it produces a
 *   broken navigation.
 *
 * What this helper does:
 *   1. Reads `x-forwarded-host` (set by the proxy to the original Host
 *      header the browser sent) — falls back to the request's `host`
 *      header if not present.
 *   2. Reads `x-forwarded-proto` (set by the proxy to `http` or `https`)
 *      — falls back to `https` in production and `http` in dev.
 *   3. Constructs `${proto}://${host}` as the origin.
 *
 * This matches what Express's `req.protocol`, NextAuth's `NEXTAUTH_URL`,
 * and most auth libraries do under a reverse proxy.
 */
export function getPublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const requestHost = request.headers.get('host');

  // When a request passes through multiple proxies, these headers can be
  // comma-separated lists like "reform.onrender.com, internal-proxy".
  // The LEFTMOST value is the original (closest to the client), so we take
  // the first element after splitting on comma.
  const firstValue = (v: string | null): string | null =>
    v ? v.split(',')[0].trim() : v;

  const host =
    firstValue(forwardedHost) || requestHost || new URL(request.url).host;
  // In production, default to https if no x-forwarded-proto header is present
  // (almost all PaaS providers terminate TLS at the proxy). In dev, the
  // request comes in over plain http on localhost.
  const proto =
    firstValue(forwardedProto) ||
    (process.env.NODE_ENV === 'production' ? 'https' : 'http');

  return `${proto}://${host}`;
}
