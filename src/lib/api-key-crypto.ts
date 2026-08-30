import { createHash, randomBytes } from 'crypto';

/**
 * API key cryptography utilities.
 *
 * Key format: `fep_live_<32 hex chars>` (40 chars total, ~128 bits of entropy)
 *
 * Security model:
 *   - The full key is returned to the user ONCE at creation/rotation time.
 *   - We persist only the SHA-256 hash (keyHash) and the first 12 chars
 *     (keyPrefix) for UI display.
 *   - On each API request, we hash the provided key and look up by keyHash.
 */

export const KEY_PREFIX = 'fep_live_';
export const KEY_ENTROPY_BYTES = 32; // 256 bits
export const PREFIX_DISPLAY_LENGTH = 12;

/**
 * Generate a new API key string.
 * Format: fep_live_<64 hex chars> (73 chars total)
 */
export function generateApiKey(): string {
  const entropy = randomBytes(KEY_ENTROPY_BYTES);
  return `${KEY_PREFIX}${entropy.toString('hex')}`;
}

/**
 * Hash an API key using SHA-256. Returns a 64-char hex string.
 * Used for database storage and lookup.
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Extract the display prefix from a full key.
 * Returns the first 12 chars (e.g. "fep_live_a1b2").
 */
export function getKeyPrefix(key: string): string {
  return key.slice(0, PREFIX_DISPLAY_LENGTH);
}

/**
 * Mask a key for display: show prefix + "..." + last 4 chars.
 * e.g. "fep_live_a1b2...3x91"
 */
export function maskApiKey(key: string): string {
  if (key.length < 16) return key;
  return `${key.slice(0, PREFIX_DISPLAY_LENGTH)}${'•'.repeat(8)}${key.slice(-4)}`;
}

/**
 * Mask a prefix for display in the keys table.
 * e.g. "fep_live_a1b2" → "fep_live_a1b2••••"
 */
export function maskPrefix(prefix: string): string {
  return `${prefix}${'•'.repeat(8)}`;
}

/**
 * Validate that a string looks like a Reform API key.
 * (Format check only — does not verify the key exists.)
 */
export function isValidKeyFormat(key: string): boolean {
  return /^fep_live_[a-f0-9]{64}$/.test(key);
}

/**
 * Permission scopes for API keys.
 * Each scope follows the pattern <resource>:<action>.
 */
export const PERMISSION_SCOPES = [
  { value: 'forms:read', label: 'Forms — Read', description: 'List and view forms' },
  { value: 'forms:write', label: 'Forms — Write', description: 'Create and publish forms' },
  { value: 'submissions:read', label: 'Submissions — Read', description: 'View form submissions' },
  { value: 'submissions:write', label: 'Submissions — Write', description: 'Submit form responses' },
] as const;

export type PermissionScope = (typeof PERMISSION_SCOPES)[number]['value'];

/**
 * Check if a set of permissions includes a required scope.
 * Uses hierarchical matching: "forms:write" implies "forms:read".
 */
export function hasPermission(
  permissions: string[],
  required: PermissionScope
): boolean {
  if (permissions.includes(required)) return true;
  // Write implies read
  const [resource, action] = required.split(':');
  if (action === 'read' && permissions.includes(`${resource}:write` as PermissionScope)) {
    return true;
  }
  return false;
}

/**
 * Parse permissions from the JSON string stored in the database.
 */
export function parsePermissions(permissionsJson: string): string[] {
  try {
    const arr = JSON.parse(permissionsJson);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Serialize permissions to a JSON string for database storage.
 */
export function serializePermissions(permissions: string[]): string {
  return JSON.stringify(permissions);
}
