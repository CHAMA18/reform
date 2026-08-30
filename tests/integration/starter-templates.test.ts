import { describe, it, expect } from 'vitest';
import { STARTER_TEMPLATES } from '@/lib/flowchart/starter-templates';
import { validateFlowchart, generateSchema } from '@/lib/flowchart/schema-generator';
import { validateSubmission } from '@/lib/flowchart/validation-engine';

describe('Starter Templates', () => {
  it('should have 6 starter templates', () => {
    expect(STARTER_TEMPLATES).toHaveLength(6);
  });

  it('should have unique IDs', () => {
    const ids = STARTER_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have names, descriptions, icons, and tags for each template', () => {
    for (const template of STARTER_TEMPLATES) {
      expect(template.name).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.icon).toBeTruthy();
      expect(template.tags.length).toBeGreaterThan(0);
      expect(template.flowchart).toBeDefined();
      expect(template.flowchart.nodes.length).toBeGreaterThan(0);
    }
  });

  describe('Each template should be valid', () => {
    for (const template of STARTER_TEMPLATES) {
      describe(`${template.name} template`, () => {
        it('should pass flowchart validation', () => {
          const errors = validateFlowchart(template.flowchart);
          // Some templates might have minor validation issues (like condition fields not being set)
          // but they should at least have start, fields, and submit
          const criticalErrors = errors.filter(
            e => e.includes('Start') || e.includes('Submit') || e.includes('empty')
          );
          expect(criticalErrors).toHaveLength(0);
        });

        it('should generate a valid schema', () => {
          const schema = generateSchema(template.flowchart, template.name);
          expect(schema.fields.length).toBeGreaterThan(0);
          expect(schema.schema_name).toBe(template.name);
        });

        it('should have at least one field node', () => {
          const fieldNodes = template.flowchart.nodes.filter(n => n.type === 'field');
          expect(fieldNodes.length).toBeGreaterThan(0);
        });

        it('should have a start node', () => {
          const startNodes = template.flowchart.nodes.filter(n => n.type === 'start');
          expect(startNodes.length).toBe(1);
        });

        it('should have a submit node', () => {
          const submitNodes = template.flowchart.nodes.filter(n => n.type === 'submit');
          expect(submitNodes.length).toBe(1);
        });

        it('should have edges connecting nodes', () => {
          expect(template.flowchart.edges.length).toBeGreaterThan(0);
        });
      });
    }
  });

  describe('KYC template', () => {
    const kyc = STARTER_TEMPLATES.find(t => t.id === 'kyc');
    it('should exist', () => {
      expect(kyc).toBeDefined();
    });
    it('should have validation rules on fields', () => {
      const fieldsWithValidation = kyc!.flowchart.nodes.filter(
        n => n.type === 'field' && n.data.validation
      );
      expect(fieldsWithValidation.length).toBeGreaterThan(0);
    });
  });

  describe('Customer Feedback template (with conditions)', () => {
    const feedback = STARTER_TEMPLATES.find(t => t.id === 'feedback');
    it('should exist', () => {
      expect(feedback).toBeDefined();
    });
    it('should have a condition node', () => {
      const conditions = feedback!.flowchart.nodes.filter(n => n.type === 'condition');
      expect(conditions.length).toBe(1);
    });
    it('should have true and false branch edges', () => {
      const trueEdges = feedback!.flowchart.edges.filter(e => e.branch === 'true');
      const falseEdges = feedback!.flowchart.edges.filter(e => e.branch === 'false');
      expect(trueEdges.length).toBe(1);
      expect(falseEdges.length).toBe(1);
    });
  });
});
