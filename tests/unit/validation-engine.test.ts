import { describe, it, expect } from 'vitest';
import { validateSubmission, buildFormSchema, isFieldVisible } from '@/lib/flowchart/validation-engine';
import type { GeneratedSchema, SchemaField } from '@/lib/flowchart/types';

function makeField(overrides: Partial<SchemaField> = {}): SchemaField {
  return {
    id: 'field_1',
    type: 'text',
    label: 'Test Field',
    required: false,
    ...overrides,
  };
}

function makeSchema(fields: SchemaField[]): GeneratedSchema {
  return {
    schema_name: 'Test Form',
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    fields,
    logic: [],
  };
}

describe('Validation Engine', () => {
  describe('validateSubmission', () => {
    it('should pass when no fields are required and data is empty', () => {
      const schema = makeSchema([makeField()]);
      const result = validateSubmission(schema, {});
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should fail when a required field is missing', () => {
      const schema = makeSchema([makeField({ required: true })]);
      const result = validateSubmission(schema, {});
      expect(result.valid).toBe(false);
      expect(result.errors['field_1']).toBeDefined();
      expect(result.errors['field_1']).toBeDefined();
      expect(result.valid).toBe(false);
    });

    it('should pass when a required field has a value', () => {
      const schema = makeSchema([makeField({ required: true })]);
      const result = validateSubmission(schema, { field_1: 'hello' });
      expect(result.valid).toBe(true);
    });

    it('should validate email format', () => {
      const schema = makeSchema([makeField({ type: 'email', required: true })]);
      
      const invalid = validateSubmission(schema, { field_1: 'not-an-email' });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors['field_1']).toContain('email');

      const valid = validateSubmission(schema, { field_1: 'test@example.com' });
      expect(valid.valid).toBe(true);
    });

    it('should validate URL format', () => {
      const schema = makeSchema([makeField({ type: 'url', required: true })]);
      
      const invalid = validateSubmission(schema, { field_1: 'not-a-url' });
      expect(invalid.valid).toBe(false);

      const valid = validateSubmission(schema, { field_1: 'https://example.com' });
      expect(valid.valid).toBe(true);
    });

    it('should validate minLength', () => {
      const schema = makeSchema([
        makeField({ type: 'text', required: true, validation: { required: true, minLength: 5 } }),
      ]);
      
      const invalid = validateSubmission(schema, { field_1: 'ab' });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors['field_1']).toContain('5');

      const valid = validateSubmission(schema, { field_1: 'abcde' });
      expect(valid.valid).toBe(true);
    });

    it('should validate maxLength', () => {
      const schema = makeSchema([
        makeField({ type: 'text', validation: { maxLength: 3 } }),
      ]);
      
      const invalid = validateSubmission(schema, { field_1: 'abcd' });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors['field_1']).toContain('3');

      const valid = validateSubmission(schema, { field_1: 'abc' });
      expect(valid.valid).toBe(true);
    });

    it('should validate regex pattern', () => {
      const schema = makeSchema([
        makeField({
          type: 'text',
          required: true,
          validation: { required: true, pattern: '^[A-Z]{3}$', patternMessage: 'Must be 3 uppercase letters' },
        }),
      ]);
      
      const invalid = validateSubmission(schema, { field_1: 'abc' });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors['field_1']).toContain('3 uppercase');

      const valid = validateSubmission(schema, { field_1: 'ABC' });
      expect(valid.valid).toBe(true);
    });

    it('should validate numeric min/max', () => {
      const schema = makeSchema([
        makeField({ type: 'number', required: true, validation: { required: true, min: 18, max: 120 } }),
      ]);
      
      const tooYoung = validateSubmission(schema, { field_1: 5 });
      expect(tooYoung.valid).toBe(false);
      expect(tooYoung.errors['field_1']).toContain('18');

      const tooOld = validateSubmission(schema, { field_1: 200 });
      expect(tooOld.valid).toBe(false);

      const valid = validateSubmission(schema, { field_1: 25 });
      expect(valid.valid).toBe(true);
    });

    it('should validate dropdown enum values', () => {
      const schema = makeSchema([
        makeField({ type: 'dropdown', required: true, options: ['Option A', 'Option B'] }),
      ]);
      
      const invalid = validateSubmission(schema, { field_1: 'Option C' });
      expect(invalid.valid).toBe(false);

      const valid = validateSubmission(schema, { field_1: 'Option A' });
      expect(valid.valid).toBe(true);
    });

    it('should validate radio enum values', () => {
      const schema = makeSchema([
        makeField({ type: 'radio', required: true, options: ['Yes', 'No'] }),
      ]);
      
      const invalid = validateSubmission(schema, { field_1: 'Maybe' });
      expect(invalid.valid).toBe(false);

      const valid = validateSubmission(schema, { field_1: 'Yes' });
      expect(valid.valid).toBe(true);
    });

    it('should validate checkbox arrays', () => {
      const schema = makeSchema([
        makeField({ type: 'checkbox', required: true, options: ['A', 'B', 'C'], validation: { required: true, min: 1, max: 2 } }),
      ]);
      
      const empty = validateSubmission(schema, { field_1: [] });
      expect(empty.valid).toBe(false);

      const tooMany = validateSubmission(schema, { field_1: ['A', 'B', 'C'] });
      expect(tooMany.valid).toBe(false);

      const valid = validateSubmission(schema, { field_1: ['A', 'B'] });
      expect(valid.valid).toBe(true);
    });

    it('should validate date ranges', () => {
      const schema = makeSchema([
        makeField({
          type: 'date',
          required: true,
          validation: { required: true, minDate: '2024-01-01', maxDate: '2024-12-31' },
        }),
      ]);
      
      const tooEarly = validateSubmission(schema, { field_1: '2023-06-15' });
      expect(tooEarly.valid).toBe(false);

      const tooLate = validateSubmission(schema, { field_1: '2025-06-15' });
      expect(tooLate.valid).toBe(false);

      const valid = validateSubmission(schema, { field_1: '2024-06-15' });
      expect(valid.valid).toBe(true);
    });

    it('should validate rating (1-5)', () => {
      const schema = makeSchema([
        makeField({ type: 'rating', required: true, validation: { required: true } }),
      ]);
      
      const valid = validateSubmission(schema, { field_1: 3 });
      expect(valid.valid).toBe(true);
    });

    it('should skip validation for optional fields with no value', () => {
      const schema = makeSchema([
        makeField({ type: 'email', validation: {} }),
      ]);
      
      const result = validateSubmission(schema, {});
      expect(result.valid).toBe(true);
    });

    it('should return only the first error per field', () => {
      const schema = makeSchema([
        makeField({
          type: 'text',
          required: true,
          validation: { required: true, minLength: 5, maxLength: 10 },
        }),
      ]);
      
      const result = validateSubmission(schema, { field_1: 'ab' });
      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors)).toHaveLength(1);
    });

    it('should handle multiple fields with mixed validation', () => {
      const schema = makeSchema([
        makeField({ id: 'name', type: 'text', required: true, validation: { required: true, minLength: 2 } }),
        makeField({ id: 'email', type: 'email', required: true, validation: { required: true } }),
        makeField({ id: 'age', type: 'number', validation: { min: 0, max: 150 } }),
      ]);
      
      const invalid = validateSubmission(schema, { name: 'A', email: 'bad', age: 200 });
      expect(invalid.valid).toBe(false);
      expect(Object.keys(invalid.errors).length).toBeGreaterThanOrEqual(2);

      const valid = validateSubmission(schema, { name: 'Alex', email: 'alex@test.com', age: 30 });
      expect(valid.valid).toBe(true);
    });
  });

  describe('isFieldVisible (conditional logic)', () => {
    it('should return true when no condition is set', () => {
      const field = makeField();
      expect(isFieldVisible(field, {})).toBe(true);
    });

    it('should return true when condition is met (==)', () => {
      const field = makeField({
        conditional: { field: 'other', operator: '==', value: 'yes' },
      });
      expect(isFieldVisible(field, { other: 'yes' })).toBe(true);
    });

    it('should return false when condition is not met (==)', () => {
      const field = makeField({
        conditional: { field: 'other', operator: '==', value: 'yes' },
      });
      expect(isFieldVisible(field, { other: 'no' })).toBe(false);
    });

    it('should handle != operator', () => {
      const field = makeField({
        conditional: { field: 'other', operator: '!=', value: 'yes' },
      });
      expect(isFieldVisible(field, { other: 'no' })).toBe(true);
      expect(isFieldVisible(field, { other: 'yes' })).toBe(false);
    });

    it('should handle empty operator', () => {
      const field = makeField({
        conditional: { field: 'other', operator: 'empty', value: '' },
      });
      expect(isFieldVisible(field, { other: '' })).toBe(true);
      expect(isFieldVisible(field, { other: 'value' })).toBe(false);
    });

    it('should handle not_empty operator', () => {
      const field = makeField({
        conditional: { field: 'other', operator: 'not_empty', value: '' },
      });
      expect(isFieldVisible(field, { other: 'value' })).toBe(true);
      expect(isFieldVisible(field, { other: '' })).toBe(false);
    });

    it('should handle contains operator', () => {
      const field = makeField({
        conditional: { field: 'other', operator: 'contains', value: 'test' },
      });
      expect(isFieldVisible(field, { other: 'this is a test' })).toBe(true);
      expect(isFieldVisible(field, { other: 'no match' })).toBe(false);
    });
  });

  describe('buildFormSchema', () => {
    it('should build a schema with all visible fields', () => {
      const schema = makeSchema([
        makeField({ id: 'a', type: 'text', required: true }),
        makeField({ id: 'b', type: 'email' }),
      ]);
      const zodSchema = buildFormSchema(schema, {});
      expect(zodSchema).toBeDefined();
    });

    it('should exclude hidden fields from the schema', () => {
      const schema = makeSchema([
        makeField({ id: 'a', type: 'text', required: true }),
        makeField({
          id: 'b',
          type: 'text',
          conditional: { field: 'a', operator: '==', value: 'show' },
        }),
      ]);
      // When 'a' is not 'show', field 'b' should be excluded
      const zodSchema = buildFormSchema(schema, { a: 'hide' });
      const result = zodSchema.safeParse({ a: 'hide' });
      expect(result.success).toBe(true);
    });
  });
});
