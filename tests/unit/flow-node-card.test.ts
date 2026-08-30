import { describe, it, expect } from 'vitest';
import { canConnect } from '@/components/flowchart/flow-node-card';

describe('Flowchart Connection Validation', () => {
  describe('canConnect', () => {
    it('should allow start → field', () => {
      expect(canConnect('start', 'field', 's1', 'f1')).toBe(true);
    });

    it('should allow field → field', () => {
      expect(canConnect('field', 'field', 'f1', 'f2')).toBe(true);
    });

    it('should allow field → condition', () => {
      expect(canConnect('field', 'condition', 'f1', 'c1')).toBe(true);
    });

    it('should allow condition → field (true branch)', () => {
      expect(canConnect('condition', 'field', 'c1', 'f1')).toBe(true);
    });

    it('should allow field → submit', () => {
      expect(canConnect('field', 'submit', 'f1', 'sub1')).toBe(true);
    });

    it('should allow submit → end', () => {
      expect(canConnect('submit', 'end', 'sub1', 'e1')).toBe(true);
    });

    it('should NOT allow end → anything (end has no output)', () => {
      expect(canConnect('end', 'field', 'e1', 'f1')).toBe(false);
    });

    it('should NOT allow anything → start (start has no input)', () => {
      expect(canConnect('field', 'start', 'f1', 's1')).toBe(false);
    });

    it('should NOT allow a node to connect to itself', () => {
      expect(canConnect('field', 'field', 'f1', 'f1')).toBe(false);
    });
  });
});
