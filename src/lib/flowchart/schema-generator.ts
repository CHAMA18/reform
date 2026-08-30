import type {
  Flowchart,
  FlowNode,
  GeneratedSchema,
  SchemaField,
} from './types';

/**
 * Generate a JSON schema from a flowchart graph.
 *
 * The schema is the canonical representation of the form that the public
 * form renderer consumes. It:
 *   - Lists all field nodes in flow order (BFS from the start node)
 *   - Resolves condition nodes into `conditional` visibility rules on fields
 *   - Includes a `logic` array documenting the branching structure
 *
 * This function is pure — it takes a Flowchart and returns a GeneratedSchema
 * with no side effects, so it can be called on every flowchart change.
 */
export function generateSchema(
  flowchart: Flowchart,
  formName = 'Untitled Form'
): GeneratedSchema {
  const { nodes, edges } = flowchart;

  // Find the start node; if none, treat the first node as start.
  const startNode =
    nodes.find((n) => n.type === 'start') ?? nodes[0];
  if (!startNode) {
    return {
      schema_name: formName,
      version: '1.0.0',
      generated_at: new Date().toISOString(),
      fields: [],
      logic: [],
    };
  }

  // BFS traversal from start to determine field order.
  const visited = new Set<string>();
  const orderedFields: FlowNode[] = [];
  const queue: string[] = [startNode.id];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    if (node.type === 'field') {
      orderedFields.push(node);
    }

    // Enqueue successors in edge order.
    const outEdges = edges.filter((e) => e.source === nodeId);
    for (const edge of outEdges) {
      if (!visited.has(edge.target)) {
        queue.push(edge.target);
      }
    }
  }

  // Build condition logic entries.
  const logic: GeneratedSchema['logic'] = nodes
    .filter((n) => n.type === 'condition')
    .map((n) => {
      const outEdges = edges.filter((e) => e.source === n.id);
      const trueEdge = outEdges.find((e) => e.branch === 'true');
      const falseEdge = outEdges.find((e) => e.branch === 'false');
      return {
        id: n.id,
        type: 'condition' as const,
        field: n.data.conditionField ?? '',
        operator: n.data.conditionOperator ?? '==',
        value: n.data.conditionValue ?? '',
        trueTarget: trueEdge?.target,
        falseTarget: falseEdge?.target,
      };
    });

  // Build fields array with conditional rules.
  // A field is "conditional" if it's only reachable via a condition's
  // true or false branch. We detect this by checking if all incoming
  // edges come from a condition node.
  const fields: SchemaField[] = orderedFields.map((node) => {
    const incomingEdges = edges.filter((e) => e.target === node.id);
    const conditionEdge = incomingEdges.find((e) => {
      const sourceNode = nodes.find((n) => n.id === e.source);
      return sourceNode?.type === 'condition';
    });

    const baseField: SchemaField = {
      id: node.id,
      type: node.data.fieldType ?? 'text',
      label: node.data.label,
      placeholder: node.data.placeholder,
      required: node.data.required ?? false,
      options: node.data.options?.filter((o) => o.trim() !== ''),
      helperText: node.data.helperText,
      // Carry over dynamic validation rules from the node config.
      // These are evaluated at runtime by the validation engine.
      validation: node.data.validation,
    };

    if (conditionEdge) {
      const conditionNode = nodes.find((n) => n.id === conditionEdge.source);
      if (conditionNode) {
        baseField.conditional = {
          field: conditionNode.data.conditionField ?? '',
          operator: conditionNode.data.conditionOperator ?? '==',
          value: conditionNode.data.conditionValue ?? '',
        };
      }
    }

    return baseField;
  });

  return {
    schema_name: formName,
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    fields,
    logic,
  };
}

/**
 * Validate a flowchart for publishing.
 * Returns an array of error messages (empty if valid).
 */
export function validateFlowchart(flowchart: Flowchart): string[] {
  const errors: string[] = [];
  const { nodes, edges } = flowchart;

  if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
    errors.push('Flowchart is empty — add at least one node.');
    return errors;
  }

  if (!edges || !Array.isArray(edges)) {
    errors.push('Flowchart edges must be an array.');
    return errors;
  }

  // Validate that all edges have the required source/target properties.
  // A common mistake is using { from, to } instead of { source, target },
  // which would silently produce an empty schema (the BFS traversal
  // filters by e.source, so edges without source are invisible).
  const malformedEdges = edges.filter(
    (e) => !e.source || !e.target
  );
  if (malformedEdges.length > 0) {
    errors.push(
      `${malformedEdges.length} edge(s) are missing "source" or "target" properties. ` +
      'Edges must use { source, target } — not { from, to }.'
    );
  }

  // Validate that all edge endpoints reference existing node IDs.
  // This catches typos and orphaned edges early, instead of silently
  // producing a schema that's missing fields.
  const nodeIds = new Set(nodes.map((n) => n.id));
  const danglingEdges = edges.filter(
    (e) => e.source && e.target && (!nodeIds.has(e.source) || !nodeIds.has(e.target))
  );
  if (danglingEdges.length > 0) {
    errors.push(
      `${danglingEdges.length} edge(s) reference nonexistent node IDs. ` +
      'All source/target values must match a node id.'
    );
  }

  const hasStart = nodes.some((n) => n.type === 'start');
  if (!hasStart) {
    errors.push('Flowchart must have a Start node.');
  }

  const hasField = nodes.some((n) => n.type === 'field');
  if (!hasField) {
    errors.push('Flowchart must have at least one Input Field.');
  }

  const hasSubmit = nodes.some((n) => n.type === 'submit');
  if (!hasSubmit) {
    errors.push('Flowchart must have a Submit node.');
  }

  // Check that field nodes have labels.
  const unlabeledFields = nodes.filter(
    (n) => n.type === 'field' && !n.data.label?.trim()
  );
  if (unlabeledFields.length > 0) {
    errors.push(`${unlabeledFields.length} field(s) are missing labels.`);
  }

  // Check that dropdown/radio/checkbox fields have options.
  const optionFields = nodes.filter(
    (n) =>
      n.type === 'field' &&
      ['dropdown', 'radio', 'checkbox'].includes(n.data.fieldType ?? '')
  );
  for (const field of optionFields) {
    const opts = (field.data.options ?? []).filter((o) => o.trim() !== '');
    if (opts.length < 1) {
      errors.push(`Field "${field.data.label}" needs at least one option.`);
    }
  }

  return errors;
}

/**
 * Generate a unique node id.
 */
export function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate a unique edge id.
 */
export function generateEdgeId(): string {
  return `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create the default starter flowchart with a start → field → submit → end chain.
 */
export function createDefaultFlowchart(): Flowchart {
  const startId = generateNodeId();
  const fieldId = generateNodeId();
  const submitId = generateNodeId();
  const endId = generateNodeId();

  return {
    nodes: [
      {
        id: startId,
        type: 'start',
        position: { x: 80, y: 240 },
        data: { label: 'Start' },
      },
      {
        id: fieldId,
        type: 'field',
        position: { x: 360, y: 220 },
        data: {
          label: 'Full Name',
          fieldType: 'text',
          placeholder: 'e.g. Alex Sterling',
          required: true,
          options: [],
          helperText: '',
        },
      },
      {
        id: submitId,
        type: 'submit',
        position: { x: 680, y: 240 },
        data: { label: 'Submit' },
      },
      {
        id: endId,
        type: 'end',
        position: { x: 960, y: 240 },
        data: { label: 'End' },
      },
    ],
    edges: [
      { id: generateEdgeId(), source: startId, target: fieldId },
      { id: generateEdgeId(), source: fieldId, target: submitId },
      { id: generateEdgeId(), source: submitId, target: endId },
    ],
  };
}
