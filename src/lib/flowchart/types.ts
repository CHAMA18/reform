/**
 * Type definitions for the FlowEngine flowchart builder.
 *
 * A flowchart is a directed graph of Nodes connected by Edges.
 * Each Node represents either:
 *   - a "field" (renders an input in the published form)
 *   - a "logic" node (branching, conditionals, etc.)
 *   - a "terminal" node (start, submit, end)
 *
 * The flowchart is serializable to JSON and stored in the Form.flowchart
 * column. The schema (list of fields + validation rules) is generated
 * from the flowchart and stored in Form.schema.
 */

export type NodeType =
  | 'start'
  | 'field'
  | 'condition'
  | 'submit'
  | 'end';

export type FieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'textarea'
  | 'dropdown'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'rating'
  | 'file';

export interface FlowNodeData {
  /** Human-readable label shown in the node card. */
  label: string;
  /** For field nodes: the type of input to render. */
  fieldType?: FieldType;
  /** For field nodes: the input placeholder. */
  placeholder?: string;
  /** For field nodes: whether the field is required. */
  required?: boolean;
  /** For dropdown/radio/checkbox: the options. */
  options?: string[];
  /** For field nodes: helper text shown below the input. */
  helperText?: string;
  /** For condition nodes: the field id to evaluate. */
  conditionField?: string;
  /** For condition nodes: the operator (==, !=, >, <, contains). */
  conditionOperator?: string;
  /** For condition nodes: the value to compare against. */
  conditionValue?: string;
  /** Arbitrary notes for the builder (not shown to end users). */
  notes?: string;
  /**
   * Dynamic validation rules for field nodes.
   * These are stored in the form config and evaluated at runtime by the
   * validation engine — NOT hardcoded in application code.
   */
  validation?: ValidationRules;
}

/**
 * Dynamic validation rules for a form field.
 *
 * These rules are stored as part of the form configuration (JSON) and
 * parsed at runtime by the validation engine. This keeps the validation
 * logic fully data-driven — changing a rule requires only updating the
 * form config, not redeploying the application.
 *
 * Supported rules depend on the field type:
 *   - text/textarea: minLength, maxLength, pattern
 *   - number: min, max
 *   - email: pattern (defaults to email regex if not specified)
 *   - dropdown/radio/checkbox: (options are the valid enum values)
 *   - date: minDate, maxDate
 */
export interface ValidationRules {
  /** Whether the field must have a value. */
  required?: boolean;
  /** Minimum string length (for text/textarea). */
  minLength?: number;
  /** Maximum string length (for text/textarea). */
  maxLength?: number;
  /** Regex pattern (for text/email/url). */
  pattern?: string;
  /** Custom error message to show when validation fails. */
  patternMessage?: string;
  /** Minimum numeric value (for number). */
  min?: number;
  /** Maximum numeric value (for number). */
  max?: number;
  /** Minimum date (ISO string, for date fields). */
  minDate?: string;
  /** Maximum date (ISO string, for date fields). */
  maxDate?: string;
  /** Custom error message overriding the default. */
  errorMessage?: string;
}

export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: FlowNodeData;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  /** Label shown on the edge (e.g. "true" / "false" for condition branches). */
  label?: string;
  /** For condition branches: which branch this edge represents. */
  branch?: 'true' | 'false';
}

export interface Flowchart {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface SchemaField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  helperText?: string;
  /** Conditional visibility: only show this field if the condition is met. */
  conditional?: {
    field: string;
    operator: string;
    value: string;
  };
  /**
   * Dynamic validation rules — parsed at runtime by the validation engine.
   * This is what makes the form engine "dynamic": rules live in the config,
   * not in application code.
   */
  validation?: ValidationRules;
}

export interface GeneratedSchema {
  schema_name: string;
  version: string;
  generated_at: string;
  fields: SchemaField[];
  logic: Array<{
    id: string;
    type: 'condition';
    field: string;
    operator: string;
    value: string;
    trueTarget?: string;
    falseTarget?: string;
  }>;
}

/**
 * The node type catalog — drives the palette panel in the builder.
 * Each entry defines the default data and visual style for a new node.
 */
export const NODE_CATALOG: Record<
  NodeType,
  {
    label: string;
    icon: string;
    color: string;
    description: string;
    defaultData: Partial<FlowNodeData>;
  }
> = {
  start: {
    label: 'Start',
    icon: 'play_circle',
    color: '#10b981',
    description: 'Entry point of the form flow',
    defaultData: { label: 'Start' },
  },
  field: {
    label: 'Input Field',
    icon: 'input',
    color: '#0066ff',
    description: 'A user input field (text, email, dropdown, etc.)',
    defaultData: {
      label: 'New Field',
      fieldType: 'text',
      placeholder: '',
      required: false,
      options: [],
      helperText: '',
    },
  },
  condition: {
    label: 'Condition',
    icon: 'alt_route',
    color: '#f59e0b',
    description: 'Branch the flow based on a field value',
    defaultData: {
      label: 'Condition',
      conditionOperator: '==',
      conditionValue: '',
    },
  },
  submit: {
    label: 'Submit',
    icon: 'send',
    color: '#8b5cf6',
    description: 'Form submission action',
    defaultData: { label: 'Submit' },
  },
  end: {
    label: 'End',
    icon: 'stop_circle',
    color: '#6b7280',
    description: 'Terminal node — flow ends here',
    defaultData: { label: 'End' },
  },
};

export const FIELD_TYPES: Array<{ value: FieldType; label: string; icon: string }> = [
  { value: 'text', label: 'Short Text', icon: 'text_fields' },
  { value: 'textarea', label: 'Long Text', icon: 'notes' },
  { value: 'email', label: 'Email', icon: 'mail' },
  { value: 'password', label: 'Password', icon: 'lock' },
  { value: 'number', label: 'Number', icon: 'pin' },
  { value: 'tel', label: 'Phone', icon: 'call' },
  { value: 'url', label: 'URL', icon: 'link' },
  { value: 'dropdown', label: 'Dropdown', icon: 'arrow_drop_down_circle' },
  { value: 'radio', label: 'Radio', icon: 'radio_button_checked' },
  { value: 'checkbox', label: 'Checkbox', icon: 'check_box' },
  { value: 'date', label: 'Date', icon: 'calendar_today' },
  { value: 'rating', label: 'Rating', icon: 'star' },
  { value: 'file', label: 'File Upload', icon: 'upload_file' },
];

export const CONDITION_OPERATORS = [
  { value: '==', label: 'equals' },
  { value: '!=', label: 'does not equal' },
  { value: '>', label: 'greater than' },
  { value: '<', label: 'less than' },
  { value: 'contains', label: 'contains' },
  { value: 'empty', label: 'is empty' },
  { value: 'not_empty', label: 'is not empty' },
];
