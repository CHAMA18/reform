import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, isValidEmail, generateSessionToken } from '@/lib/auth';

describe('Auth Library', () => {
  describe('hashPassword', () => {
    it('should produce a hash with salt:hash format', () => {
      const hash = hashPassword('mypassword');
      const parts = hash.split(':');
      expect(parts).toHaveLength(2);
      expect(parts[0].length).toBeGreaterThan(0); // salt
      expect(parts[1].length).toBe(64); // SHA-256 hex
    });

    it('should produce different hashes for the same password (unique salt)', () => {
      const hash1 = hashPassword('mypassword');
      const hash2 = hashPassword('mypassword');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify a correct password', () => {
      const hash = hashPassword('mypassword');
      expect(verifyPassword('mypassword', hash)).toBe(true);
    });

    it('should reject an incorrect password', () => {
      const hash = hashPassword('mypassword');
      expect(verifyPassword('wrongpassword', hash)).toBe(false);
    });

    it('should reject an empty password', () => {
      const hash = hashPassword('mypassword');
      expect(verifyPassword('', hash)).toBe(false);
    });

    it('should reject a malformed hash', () => {
      expect(verifyPassword('test', 'malformed-hash')).toBe(false);
    });

    it('should reject a hash with missing parts', () => {
      expect(verifyPassword('test', 'onlysalt')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should accept valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('a@b.io')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('generateSessionToken', () => {
    it('should generate a 64-char hex string', () => {
      const token = generateSessionToken();
      expect(token.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('should generate unique tokens', () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();
      expect(token1).not.toBe(token2);
    });
  });
});
