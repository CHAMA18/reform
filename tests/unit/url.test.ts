import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

// Helper to build a fake NextRequest with custom headers + url.
function buildRequest(opts: {
  url?: string;
  headers?: Record<string, string>;
}): NextRequest {
  const url = opts.url || 'http://localhost:3000/api/auth/guest';
  const headers = new Headers(opts.headers || {});
  // Cast to NextRequest — we only use .url, .headers, and the helper
  // methods that read headers, so a minimal stub is sufficient.
  return { url, headers } as unknown as NextRequest;
}

describe('getPublicOrigin', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('returns the localhost origin in dev when no proxy headers are present', async () => {
    process.env.NODE_ENV = 'development';
    const { getPublicOrigin } = await import('@/lib/url');
    const req = buildRequest({ url: 'http://localhost:3000/api/auth/guest' });
    expect(getPublicOrigin(req)).toBe('http://localhost:3000');
  });

  it('uses x-forwarded-host and x-forwarded-proto when present (Render scenario)', async () => {
    process.env.NODE_ENV = 'production';
    // Simulate Render: app is bound to 0.0.0.0:10000 but the proxy
    // forwards the original public host.
    const { getPublicOrigin } = await import('@/lib/url');
    const req = buildRequest({
      url: 'http://0.0.0.0:10000/api/auth/guest',
      headers: {
        'x-forwarded-host': 'reform.onrender.com',
        'x-forwarded-proto': 'https',
      },
    });
    expect(getPublicOrigin(req)).toBe('https://reform.onrender.com');
  });

  it('returns https in production when no x-forwarded-proto header is set', async () => {
    process.env.NODE_ENV = 'production';
    const { getPublicOrigin } = await import('@/lib/url');
    const req = buildRequest({
      url: 'http://0.0.0.0:10000/api/auth/guest',
      headers: {
        'x-forwarded-host': 'reform.onrender.com',
      },
    });
    expect(getPublicOrigin(req)).toBe('https://reform.onrender.com');
  });

  it('falls back to the Host header when x-forwarded-host is missing', async () => {
    process.env.NODE_ENV = 'development';
    const { getPublicOrigin } = await import('@/lib/url');
    const req = buildRequest({
      url: 'http://0.0.0.0:10000/api/auth/guest',
      headers: {
        host: 'localhost:3000',
      },
    });
    expect(getPublicOrigin(req)).toBe('http://localhost:3000');
  });

  it('handles multiple comma-separated x-forwarded-* values (chained proxies)', async () => {
    process.env.NODE_ENV = 'production';
    // When a request passes through multiple proxies, the header may
    // contain a comma-separated list like "reform.onrender.com, internal-proxy".
    // We should use the FIRST (leftmost) value, which is the original.
    const { getPublicOrigin } = await import('@/lib/url');
    const req = buildRequest({
      url: 'http://0.0.0.0:10000/api/auth/guest',
      headers: {
        'x-forwarded-host': 'reform.onrender.com, internal-proxy.local',
        'x-forwarded-proto': 'https, http',
      },
    });
    expect(getPublicOrigin(req)).toBe('https://reform.onrender.com');
  });
});
