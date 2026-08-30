import { describe, it, expect } from 'vitest';
import { generateSchema, validateFlowchart, generateNodeId, generateEdgeId, createDefaultFlowchart } from '@/lib/flowchart/schema-generator';
import type { Flowchart, FlowNode } from '@/lib/flowchart/types';

function makeNode(overrides: Partial<FlowNode> = {}): FlowNode {
  return {
    id: 'n1',
    type: 'field',
    position: { x: 0, y: 0 },
    data: { label: 'Test', fieldType: 'text', required: false, options: [] },
    ...overrides,
  };
}

describe('Schema Generator', () => {
  describe('createDefaultFlowchart', () => {
    it('should create a flowchart with 4 nodes', () => {
      const fc = createDefaultFlowchart();
      expect(fc.nodes).toHaveLength(4);
    });

    it('should create a flowchart with 3 edges', () => {
      const fc = createDefaultFlowchart();
      expect(fc.edges).toHaveLength(3);
    });

    it('should have start, field, submit, and end nodes', () => {
      const fc = createDefaultFlowchart();
      const types = fc.nodes.map(n => n.type);
      expect(types).toContain('start');
      expect(types).toContain('field');
      expect(types).toContain('submit');
      expect(types).toContain('end');
    });

    it('should have a required field by default', () => {
      const fc = createDefaultFlowchart();
      const field = fc.nodes.find(n => n.type === 'field');
      expect(field?.data.required).toBe(true);
    });
  });

  describe('generateSchema', () => {
    it('should generate a schema with the correct form name', () => {
      const fc = createDefaultFlowchart();
      const schema = generateSchema(fc, 'My Form');
      expect(schema.schema_name).toBe('My Form');
    });

    it('should include all field nodes in the schema', () => {
      const fc: Flowchart = {
        nodes: [
          makeNode({ id: 's', type: 'start', data: { label: 'Start' } }),
          makeNode({ id: 'f1', type: 'field', data: { label: 'Name', fieldType: 'text', required: true, options: [] } }),
          makeNode({ id: 'f2', type: 'field', data: { label: 'Email', fieldType: 'email', required: false, options: [] } }),
          makeNode({ id: 'sub', type: 'submit', data: { label: 'Submit' } }),
        ],
        edges: [
          { id: 'e1', source: 's', target: 'f1' },
          { id: 'e2', source: 'f1', target: 'f2' },
          { id: 'e3', source: 'f2', target: 'sub' },
        ],
      };
      const schema = generateSchema(fc);
      expect(schema.fields).toHaveLength(2);
      expect(schema.fields[0].label).toBe('Name');
      expect(schema.fields[1].label).toBe('Email');
    });

    it('should include validation rules in the schema', () => {
      const fc: Flowchart = {
        nodes: [
          makeNode({ id: 's', type: 'start', data: { label: 'Start' } }),
          makeNode({
            id: 'f1',
            type: 'field',
            data: {
              label: 'Age',
              fieldType: 'number',
              required: true,
              options: [],
              validation: { required: true, min: 18, max: 120 },
            },
          }),
          makeNode({ id: 'sub', type: 'submit', data: { label: 'Submit' } }),
        ],
        edges: [
          { id: 'e1', source: 's', target: 'f1' },
          { id: 'e2', source: 'f1', target: 'sub' },
        ],
      };
      const schema = generateSchema(fc);
      expect(schema.fields[0].validation).toBeDefined();
      expect(schema.fields[0].validation?.min).toBe(18);
      expect(schema.fields[0].validation?.max).toBe(120);
    });

    it('should handle empty flowchart', () => {
      const schema = generateSchema({ nodes: [], edges: [] });
      expect(schema.fields).toHaveLength(0);
    });

    it('should include condition logic in the schema', () => {
      const fc: Flowchart = {
        nodes: [
          makeNode({ id: 's', type: 'start', data: { label: 'Start' } }),
          makeNode({ id: 'f1', type: 'field', data: { label: 'Rating', fieldType: 'rating', required: true, options: [] } }),
          makeNode({
            id: 'c1',
            type: 'condition',
            data: {
              label: 'Low Rating',
              conditionField: 'f1',
              conditionOperator: '<',
              conditionValue: '3',
            },
          }),
          makeNode({ id: 'sub', type: 'submit', data: { label: 'Submit' } }),
        ],
        edges: [
          { id: 'e1', source: 's', target: 'f1' },
          { id: 'e2', source: 'f1', target: 'c1' },
          { id: 'e3', source: 'c1', target: 'sub', branch: 'true' as const },
        ],
      };
      const schema = generateSchema(fc);
      expect(schema.logic).toHaveLength(1);
      expect(schema.logic[0].field).toBe('f1');
      expect(schema.logic[0].operator).toBe('<');
    });
  });

  describe('validateFlowchart', () => {
    it('should return errors for empty flowchart', () => {
      const errors = validateFlowchart({ nodes: [], edges: [] });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('empty');
    });

    it('should require a start node', () => {
      const fc: Flowchart = {
        nodes: [makeNode({ id: 'f1', type: 'field' })],
        edges: [],
      };
      const errors = validateFlowchart(fc);
      expect(errors.some(e => e.includes('Start'))).toBe(true);
    });

    it('should require at least one field node', () => {
      const fc: Flowchart = {
        nodes: [
          makeNode({ id: 's', type: 'start', data: { label: 'Start' } }),
          makeNode({ id: 'sub', type: 'submit', data: { label: 'Submit' } }),
        ],
        edges: [],
      };
      const errors = validateFlowchart(fc);
      expect(errors.some(e => e.includes('Input Field'))).toBe(true);
    });

    it('should require a submit node', () => {
      const fc: Flowchart = {
        nodes: [
          makeNode({ id: 's', type: 'start', data: { label: 'Start' } }),
          makeNode({ id: 'f1', type: 'field', data: { label: 'Name', fieldType: 'text', options: [] } }),
        ],
        edges: [],
      };
      const errors = validateFlowchart(fc);
      expect(errors.some(e => e.includes('Submit'))).toBe(true);
    });

    it('should validate that field nodes have labels', () => {
      const fc: Flowchart = {
        nodes: [
          makeNode({ id: 's', type: 'start', data: { label: 'Start' } }),
          makeNode({ id: 'f1', type: 'field', data: { label: '', fieldType: 'text', options: [] } }),
          makeNode({ id: 'sub', type: 'submit', data: { label: 'Submit' } }),
        ],
        edges: [],
      };
      const errors = validateFlowchart(fc);
      expect(errors.some(e => e.includes('label'))).toBe(true);
    });

    it('should validate that dropdown fields have options', () => {
      const fc: Flowchart = {
        nodes: [
          makeNode({ id: 's', type: 'start', data: { label: 'Start' } }),
          makeNode({ id: 'f1', type: 'field', data: { label: 'Choice', fieldType: 'dropdown', options: [] } }),
          makeNode({ id: 'sub', type: 'submit', data: { label: 'Submit' } }),
        ],
        edges: [],
      };
      const errors = validateFlowchart(fc);
      expect(errors.some(e => e.includes('option'))).toBe(true);
    });

    it('should pass for a valid flowchart', () => {
      const fc = createDefaultFlowchart();
      const errors = validateFlowchart(fc);
      expect(errors).toHaveLength(0);
    });
  });

  describe('generateNodeId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateNodeId();
      const id2 = generateNodeId();
      expect(id1).not.toBe(id2);
    });

    it('should start with "node_"', () => {
      expect(generateNodeId().startsWith('node_')).toBe(true);
    });
  });

  describe('generateEdgeId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateEdgeId();
      const id2 = generateEdgeId();
      expect(id1).not.toBe(id2);
    });

    it('should start with "edge_"', () => {
      expect(generateEdgeId().startsWith('edge_')).toBe(true);
    });
  });
});
