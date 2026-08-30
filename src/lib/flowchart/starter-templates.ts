import type { Flowchart } from './types';
import { generateNodeId, generateEdgeId } from './schema-generator';

/**
 * Starter Templates
 *
 * Pre-built flowchart definitions that users can load into the builder with
 * one click. Each template is a complete Flowchart with nodes, edges, and
 * validation rules — ready to publish or customize.
 *
 * These are defined in code (not the database) so they're always available
 * as a starting point. When a user clicks "Use Template", the flowchart is
 * loaded into the builder via the Zustand store.
 */

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  accentColor: string;
  tags: string[];
  flowchart: Flowchart;
}

/**
 * Build a flowchart from a compact node/edge definition.
 * Reduces boilerplate when defining templates.
 */
function buildFlowchart(
  nodes: Array<{
    type: 'start' | 'field' | 'condition' | 'submit' | 'end';
    label: string;
    fieldType?: string;
    required?: boolean;
    placeholder?: string;
    options?: string[];
    validation?: Record<string, unknown>;
    conditionField?: string;
    conditionOperator?: string;
    conditionValue?: string;
  }>,
  edges?: Array<{ from: number; to: number; branch?: 'true' | 'false' }>
): Flowchart {
  const nodeIds = nodes.map(() => generateNodeId());
  const positions = nodes.map((_, i) => ({
    x: 80 + (i % 3) * 280,
    y: 120 + Math.floor(i / 3) * 180,
  }));

  return {
    nodes: nodes.map((n, i) => ({
      id: nodeIds[i],
      type: n.type,
      position: positions[i],
      data: {
        label: n.label,
        fieldType: n.fieldType as never,
        required: n.required,
        placeholder: n.placeholder,
        options: n.options ?? [],
        validation: n.validation as never,
        conditionField: n.conditionField,
        conditionOperator: n.conditionOperator,
        conditionValue: n.conditionValue,
      },
    })),
    edges: (edges ?? nodes.slice(0, -1).map((_, i) => ({ from: i, to: i + 1 }))).map(
      (e) => ({
        id: generateEdgeId(),
        source: nodeIds[e.from],
        target: nodeIds[e.to],
        branch: e.branch,
        label: e.branch === 'true' ? 'true' : e.branch === 'false' ? 'false' : undefined,
      })
    ),
  };
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'kyc',
    name: 'Enterprise KYC',
    description:
      'Multi-stage identity verification with email, phone, date of birth, and government ID number. All fields required with format validation.',
    icon: 'fingerprint',
    accentColor: '#0066ff',
    tags: ['Fintech', 'Compliance', 'Required Fields'],
    flowchart: buildFlowchart([
      { type: 'start', label: 'Start' },
      { type: 'field', label: 'Full Name', fieldType: 'text', required: true, placeholder: 'Jane Doe', validation: { required: true, minLength: 2, maxLength: 100 } },
      { type: 'field', label: 'Email Address', fieldType: 'email', required: true, placeholder: 'jane@company.com', validation: { required: true } },
      { type: 'field', label: 'Phone Number', fieldType: 'tel', required: true, placeholder: '+1 (555) 000-0000', validation: { required: true, pattern: '^[+]?[0-9\\s\\-()]+$', patternMessage: 'Invalid phone number' } },
      { type: 'field', label: 'Date of Birth', fieldType: 'date', required: true, validation: { required: true, maxDate: '2010-01-01' } },
      { type: 'field', label: 'Government ID Number', fieldType: 'text', required: true, placeholder: 'e.g. Passport number', validation: { required: true, minLength: 5, maxLength: 30 } },
      { type: 'field', label: 'ID Type', fieldType: 'dropdown', required: true, options: ['Passport', "Driver's License", 'National ID'] },
      { type: 'submit', label: 'Submit Verification' },
    ]),
  },
  {
    id: 'feedback',
    name: 'Customer Feedback',
    description:
      'Net Promoter Score feedback form with rating, category selection, and conditional comments. The comment field only appears when the rating is 3 stars or below.',
    icon: 'forum',
    accentColor: '#8b5cf6',
    tags: ['SaaS', 'NPS', 'Conditional Logic'],
    flowchart: (() => {
      const fc = buildFlowchart([
        { type: 'start', label: 'Start' },
        { type: 'field', label: 'How would you rate your experience?', fieldType: 'rating', required: true, validation: { required: true } },
        { type: 'field', label: 'Feedback Category', fieldType: 'dropdown', required: true, options: ['Product', 'Support', 'Billing', 'Other'] },
        { type: 'condition', label: 'Low Rating?', conditionField: '', conditionOperator: '<', conditionValue: '3' },
        { type: 'field', label: 'What went wrong?', fieldType: 'textarea', required: true, placeholder: 'Tell us more...', validation: { required: true, minLength: 10, maxLength: 500 } },
        { type: 'field', label: 'Email (optional)', fieldType: 'email', required: false, placeholder: 'For follow-up' },
        { type: 'submit', label: 'Submit Feedback' },
      ]);
      // Wire up: start → rating → category → condition
      // condition.true (low rating) → comments → email → submit
      // condition.false (high rating) → email → submit
      const ids = fc.nodes.map((n) => n.id);
      fc.edges = [
        { id: generateEdgeId(), source: ids[0], target: ids[1] },
        { id: generateEdgeId(), source: ids[1], target: ids[2] },
        { id: generateEdgeId(), source: ids[2], target: ids[3] },
        // True branch (low rating) → go to comments
        { id: generateEdgeId(), source: ids[3], target: ids[4], branch: 'true' as const, label: 'true' },
        // False branch (high rating) → skip comments, go to email
        { id: generateEdgeId(), source: ids[3], target: ids[5], branch: 'false' as const, label: 'false' },
        { id: generateEdgeId(), source: ids[4], target: ids[5] },
        { id: generateEdgeId(), source: ids[5], target: ids[6] },
      ];
      // Point the condition field at the rating field
      fc.nodes[3].data.conditionField = ids[1];
      return fc;
    })(),
  },
  {
    id: 'event',
    name: 'Event Registration',
    description:
      'Conference registration with attendee info, ticket type selection, dietary restrictions, and optional company name.',
    icon: 'event',
    accentColor: '#10b981',
    tags: ['Events', 'Multi-Field'],
    flowchart: buildFlowchart([
      { type: 'start', label: 'Start' },
      { type: 'field', label: 'Attendee Name', fieldType: 'text', required: true, placeholder: 'Jane Doe', validation: { required: true, minLength: 2 } },
      { type: 'field', label: 'Email', fieldType: 'email', required: true, placeholder: 'jane@email.com', validation: { required: true } },
      { type: 'field', label: 'Ticket Type', fieldType: 'radio', required: true, options: ['Standard ($299)', 'VIP ($599)', 'Student ($99)'] },
      { type: 'field', label: 'Company (optional)', fieldType: 'text', required: false, placeholder: 'Acme Inc.' },
      { type: 'field', label: 'Dietary Restrictions', fieldType: 'checkbox', required: false, options: ['Vegetarian', 'Vegan', 'Gluten-Free', 'None'] },
      { type: 'submit', label: 'Register' },
    ]),
  },
  {
    id: 'support',
    name: 'Support Ticket',
    description:
      'IT support request with priority selection, category, and detailed description. Priority field uses dropdown with SLA-mapped options.',
    icon: 'support_agent',
    accentColor: '#f59e0b',
    tags: ['IT', 'Helpdesk'],
    flowchart: buildFlowchart([
      { type: 'start', label: 'Start' },
      { type: 'field', label: 'Your Name', fieldType: 'text', required: true, validation: { required: true, minLength: 2 } },
      { type: 'field', label: 'Email', fieldType: 'email', required: true, validation: { required: true } },
      { type: 'field', label: 'Priority', fieldType: 'dropdown', required: true, options: ['Low', 'Medium', 'High', 'Critical'] },
      { type: 'field', label: 'Category', fieldType: 'dropdown', required: true, options: ['Hardware', 'Software', 'Network', 'Account', 'Other'] },
      { type: 'field', label: 'Subject', fieldType: 'text', required: true, placeholder: 'Brief summary', validation: { required: true, minLength: 5, maxLength: 100 } },
      { type: 'field', label: 'Description', fieldType: 'textarea', required: true, placeholder: 'Describe the issue in detail...', validation: { required: true, minLength: 20, maxLength: 2000 } },
      { type: 'submit', label: 'Submit Ticket' },
    ]),
  },
  {
    id: 'job',
    name: 'Job Application',
    description:
      'Employment application with personal info, position selection, experience, and cover letter. LinkedIn URL is optional.',
    icon: 'work',
    accentColor: '#0ea5e9',
    tags: ['HR', 'Recruitment'],
    flowchart: buildFlowchart([
      { type: 'start', label: 'Start' },
      { type: 'field', label: 'Full Name', fieldType: 'text', required: true, validation: { required: true, minLength: 2 } },
      { type: 'field', label: 'Email', fieldType: 'email', required: true, validation: { required: true } },
      { type: 'field', label: 'Phone', fieldType: 'tel', required: true, validation: { required: true } },
      { type: 'field', label: 'Position', fieldType: 'dropdown', required: true, options: ['Frontend Engineer', 'Backend Engineer', 'Full-Stack Engineer', 'Product Designer', 'Product Manager'] },
      { type: 'field', label: 'Years of Experience', fieldType: 'number', required: true, validation: { required: true, min: 0, max: 50 } },
      { type: 'field', label: 'LinkedIn URL (optional)', fieldType: 'url', required: false, placeholder: 'https://linkedin.com/in/...' },
      { type: 'field', label: 'Cover Letter', fieldType: 'textarea', required: true, validation: { required: true, minLength: 50, maxLength: 5000 } },
      { type: 'submit', label: 'Submit Application' },
    ]),
  },
  {
    id: 'contact',
    name: 'Contact Form',
    description:
      'Simple contact form with name, email, subject, and message. The minimal starting point — great for landing pages.',
    icon: 'mail',
    accentColor: '#ec4899',
    tags: ['Marketing', 'Simple'],
    flowchart: buildFlowchart([
      { type: 'start', label: 'Start' },
      { type: 'field', label: 'Name', fieldType: 'text', required: true, validation: { required: true, minLength: 2, maxLength: 80 } },
      { type: 'field', label: 'Email', fieldType: 'email', required: true, validation: { required: true } },
      { type: 'field', label: 'Subject', fieldType: 'text', required: true, validation: { required: true, minLength: 3, maxLength: 100 } },
      { type: 'field', label: 'Message', fieldType: 'textarea', required: true, validation: { required: true, minLength: 10, maxLength: 1000 } },
      { type: 'submit', label: 'Send Message' },
    ]),
  },
];
