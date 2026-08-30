import { describe, it, expect } from 'vitest';
import { generateSchema, validateFlowchart, createDefaultFlowchart } from '@/lib/flowchart/schema-generator';
import { validateSubmission } from '@/lib/flowchart/validation-engine';
import { STARTER_TEMPLATES } from '@/lib/flowchart/starter-templates';
import type { Flowchart, SchemaField } from '@/lib/flowchart/types';

/**
 * Generate valid test data for a field based on its type and validation rules.
 */
function getValidValueForField(field: SchemaField): unknown {
  // Check conditional visibility — skip if hidden
  switch (field.type) {
    case 'text':
      // Respect minLength if set
      const minLen = field.validation?.minLength ?? 2;
      return 'A'.repeat(Math.max(minLen, 5));
    case 'textarea':
      const minTALen = field.validation?.minLength ?? 10;
      return 'This is a test response. '.repeat(Math.ceil(minTALen / 28));
    case 'email':
      return 'test@example.com';
    case 'password':
      return 'Password123!';
    case 'number':
      const min = field.validation?.min ?? 0;
      const max = field.validation?.max ?? 100;
      return Math.min(Math.max(min + 1, 25), max);
    case 'tel':
      return '+1234567890';
    case 'url':
      return 'https://example.com';
    case 'date':
      // If minDate/maxDate, use a date in range
      if (field.validation?.maxDate) return field.validation.maxDate;
      if (field.validation?.minDate) return field.validation.minDate;
      return '2024-06-15';
    case 'dropdown':
    case 'radio':
      return field.options?.[0] ?? 'option';
    case 'checkbox':
      const minSel = field.validation?.min ?? 1;
      return field.options?.slice(0, Math.max(minSel, 1)) ?? ['option'];
    case 'rating':
      return 4;
    case 'file':
      return 'document.pdf';
    default:
      return 'test';
  }
}

describe('End-to-End: Form Lifecycle', () => {
  describe('Default flowchart → schema → validation', () => {
    it('should create a valid default flowchart', () => {
      const fc = createDefaultFlowchart();
      const errors = validateFlowchart(fc);
      expect(errors).toHaveLength(0);
    });

    it('should generate a schema from the default flowchart', () => {
      const fc = createDefaultFlowchart();
      const schema = generateSchema(fc, 'Default Form');
      expect(schema.fields).toHaveLength(1);
      expect(schema.fields[0].label).toBe('Full Name');
      expect(schema.fields[0].required).toBe(true);
    });

    it('should validate a submission against the default schema', () => {
      const fc = createDefaultFlowchart();
      const schema = generateSchema(fc, 'Default Form');
      
      // Valid submission
      const valid = validateSubmission(schema, { [schema.fields[0].id]: 'Alex Sterling' });
      expect(valid.valid).toBe(true);

      // Invalid (empty required field)
      const invalid = validateSubmission(schema, {});
      expect(invalid.valid).toBe(false);
    });
  });

  describe('Starter template → schema → validation → submission', () => {
    for (const template of STARTER_TEMPLATES) {
      it(`should complete the full lifecycle for ${template.name}`, () => {
        // 1. Validate the flowchart
        const fcErrors = validateFlowchart(template.flowchart);
        expect(fcErrors).toHaveLength(0);

        // 2. Generate the schema
        const schema = generateSchema(template.flowchart, template.name);
        expect(schema.fields.length).toBeGreaterThan(0);

        // 3. Create a valid submission with type-appropriate values
        const validData: Record<string, unknown> = {};
        for (const field of schema.fields) {
          // Skip conditional fields — they might not be visible
          if (field.conditional) continue;
          if (!field.required) continue;
          validData[field.id] = getValidValueForField(field);
        }

        // 4. Validate the submission
        const result = validateSubmission(schema, validData);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual({});
      });

      it(`should reject empty submission for ${template.name}`, () => {
        const schema = generateSchema(template.flowchart, template.name);
        const result = validateSubmission(schema, {});
        
        // At least one field should be required
        const hasRequired = schema.fields.some(f => f.required && !f.conditional);
        if (hasRequired) {
          expect(result.valid).toBe(false);
        }
      });
    }
  });

  describe('Conditional logic flow', () => {
    it('should skip hidden fields during validation', () => {
      const fc: Flowchart = {
        nodes: [
          { id: 's', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
          { id: 'rating', type: 'field', position: { x: 100, y: 0 }, data: { label: 'Rating', fieldType: 'rating', required: true, options: [], validation: { required: true } } },
          { id: 'cond', type: 'condition', position: { x: 200, y: 0 }, data: { label: 'Low?', conditionField: 'rating', conditionOperator: '<', conditionValue: '3' } },
          { id: 'comments', type: 'field', position: { x: 300, y: 0 }, data: { label: 'Comments', fieldType: 'textarea', required: true, options: [], validation: { required: true, minLength: 10 } } },
          { id: 'sub', type: 'submit', position: { x: 400, y: 0 }, data: { label: 'Submit' } },
        ],
        edges: [
          { id: 'e1', source: 's', target: 'rating' },
          { id: 'e2', source: 'rating', target: 'cond' },
          { id: 'e3', source: 'cond', target: 'comments', branch: 'true' },
          { id: 'e4', source: 'cond', target: 'sub', branch: 'false' },
          { id: 'e5', source: 'comments', target: 'sub' },
        ],
      };

      const schema = generateSchema(fc, 'Feedback');

      // High rating (5) — comments field is hidden (condition: rating < 3 is false)
      const highRating = validateSubmission(schema, { rating: 5 });
      expect(highRating.valid).toBe(true);

      // Low rating (2) — comments field is visible and required, should fail without it
      const lowRatingNoComment = validateSubmission(schema, { rating: 2 });
      expect(lowRatingNoComment.valid).toBe(false);

      // Low rating (2) with comments — should pass
      const lowRatingWithComment = validateSubmission(schema, { rating: 2, comments: 'This is a long enough comment for validation' });
      expect(lowRatingWithComment.valid).toBe(true);
    });
  });
});
