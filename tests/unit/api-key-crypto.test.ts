import { describe, it, expect } from 'vitest';
import {
  generateApiKey,
  hashApiKey,
  getKeyPrefix,
  maskApiKey,
  maskPrefix,
  isValidKeyFormat,
  hasPermission,
  parsePermissions,
  serializePermissions,
  PERMISSION_SCOPES,
} from '@/lib/api-key-crypto';

describe('API Key Crypto', () => {
  describe('generateApiKey', () => {
    it('should generate a key with the correct prefix', () => {
      const key = generateApiKey();
      expect(key.startsWith('fep_live_')).toBe(true);
    });

    it('should generate a key with 64 hex chars after the prefix', () => {
      const key = generateApiKey();
      const hexPart = key.replace('fep_live_', '');
      expect(hexPart.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hexPart)).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('hashApiKey', () => {
    it('should produce a consistent hash for the same key', () => {
      const key = 'fep_live_abc123';
      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different keys', () => {
      const hash1 = hashApiKey('fep_live_abc');
      const hash2 = hashApiKey('fep_live_def');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce a 64-char hex string', () => {
      const hash = hashApiKey('test');
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
  });

  describe('getKeyPrefix', () => {
    it('should return the first 12 characters', () => {
      const key = 'fep_live_abcdef1234567890';
      expect(getKeyPrefix(key)).toBe('fep_live_abc');
    });
  });

  describe('maskApiKey', () => {
    it('should mask the middle of the key', () => {
      const key = 'fep_live_abcdefghijklmnop';
      const masked = maskApiKey(key);
      expect(masked.startsWith('fep_live_abc')).toBe(true);
      expect(masked.endsWith('mnop')).toBe(true);
      expect(masked).toContain('•');
    });
  });

  describe('maskPrefix', () => {
    it('should append bullets to the prefix', () => {
      const masked = maskPrefix('fep_live_abc');
      expect(masked).toBe('fep_live_abc••••••••');
    });
  });

  describe('isValidKeyFormat', () => {
    it('should accept a valid key format', () => {
      const key = 'fep_live_' + 'a'.repeat(64);
      expect(isValidKeyFormat(key)).toBe(true);
    });

    it('should reject a key without the prefix', () => {
      expect(isValidKeyFormat('abc123')).toBe(false);
    });

    it('should reject a key with wrong length', () => {
      expect(isValidKeyFormat('fep_live_abc')).toBe(false);
    });

    it('should reject a key with non-hex characters', () => {
      expect(isValidKeyFormat('fep_live_' + 'z'.repeat(64))).toBe(false);
    });
  });

  describe('Permission scopes', () => {
    it('should have 4 permission scopes', () => {
      expect(PERMISSION_SCOPES).toHaveLength(4);
    });

    it('should include forms:read and forms:write', () => {
      const values = PERMISSION_SCOPES.map(s => s.value);
      expect(values).toContain('forms:read');
      expect(values).toContain('forms:write');
    });

    it('should include submissions:read and submissions:write', () => {
      const values = PERMISSION_SCOPES.map(s => s.value);
      expect(values).toContain('submissions:read');
      expect(values).toContain('submissions:write');
    });
  });

  describe('hasPermission', () => {
    it('should return true when the scope is directly included', () => {
      expect(hasPermission(['forms:read'], 'forms:read')).toBe(true);
    });

    it('should return false when the scope is not included', () => {
      expect(hasPermission(['forms:read'], 'forms:write')).toBe(false);
    });

    it('should return true for read when write is included (hierarchical)', () => {
      expect(hasPermission(['forms:write'], 'forms:read')).toBe(true);
    });

    it('should return true for read when write is included (submissions)', () => {
      expect(hasPermission(['submissions:write'], 'submissions:read')).toBe(true);
    });

    it('should not cross resource boundaries', () => {
      expect(hasPermission(['forms:write'], 'submissions:read')).toBe(false);
    });
  });

  describe('parsePermissions', () => {
    it('should parse a valid JSON array', () => {
      expect(parsePermissions('["forms:read","forms:write"]')).toEqual(['forms:read', 'forms:write']);
    });

    it('should return empty array for invalid JSON', () => {
      expect(parsePermissions('invalid')).toEqual([]);
    });

    it('should return empty array for non-array JSON', () => {
      expect(parsePermissions('{"key":"value"}')).toEqual([]);
    });
  });

  describe('serializePermissions', () => {
    it('should serialize an array to JSON string', () => {
      const result = serializePermissions(['forms:read', 'forms:write']);
      expect(result).toBe('["forms:read","forms:write"]');
    });

    it('should handle empty array', () => {
      expect(serializePermissions([])).toBe('[]');
    });
  });
});
