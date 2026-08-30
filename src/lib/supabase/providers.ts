import { createClient } from '@/lib/supabase/client';

/**
 * Provider availability cache.
 *
 * We only fetch /auth/v1/settings once per page load - the enabled providers
 * list changes very rarely (only when an admin toggles one in the Supabase
 * dashboard), so caching avoids hammering the endpoint on every click.
 */
let cachedProviders: Record<string, boolean> | null = null;
let inflight: Promise<Record<string, boolean>> | null = null;

/**
 * Returns a map of provider name -> enabled boolean for the current Supabase
 * project. Pulls from the public /auth/v1/settings endpoint.
 *
 * Example return value:
 *   { email: true, github: false, google: false, ... }
 *
 * On error, returns an empty object - callers should treat unknown providers
 * as "enabled" (i.e. let Supabase itself reject them) rather than blocking
 * the click, so we never falsely claim a working provider is broken.
 */
export async function getAuthProviders(): Promise<Record<string, boolean>> {
  if (cachedProviders) return cachedProviders;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const supabase = createClient();
      // The supabase-js SDK does not expose a typed wrapper around
      // /auth/v1/settings, so we hit the REST endpoint directly. The anon
      // key is required as the apikey header - the SDK already attaches it
      // to all requests via the configured auth header.
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`;
      const res = await fetch(url, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
      });
      if (!res.ok) {
        cachedProviders = {};
        return cachedProviders;
      }
      const json = (await res.json()) as {
        external?: Record<string, boolean>;
      };
      cachedProviders = json.external || {};
      return cachedProviders;
    } catch {
      cachedProviders = {};
      return cachedProviders;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/**
 * Convenience: is a specific OAuth provider enabled on this Supabase project?
 *
 * Returns true when the settings call fails - that way a network blip never
 * blocks the user from attempting OAuth. Supabase's own error page is the
 * fallback, which is still better than falsely telling the user a working
 * provider is broken.
 */
export async function isProviderEnabled(provider: string): Promise<boolean> {
  const providers = await getAuthProviders();
  if (Object.keys(providers).length === 0) return true; // unknown -> allow
  return providers[provider] === true;
}

// `createClient` is imported for callers that want to reuse the same browser
// client instance; we don't use it here but re-export so consumers can
// avoid a second import. (Kept as a no-op export to satisfy linters.)
export { createClient };
