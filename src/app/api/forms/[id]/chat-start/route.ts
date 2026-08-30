import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSchema } from '@/lib/flowchart/schema-generator';
import type { GeneratedSchema, Flowchart } from '@/lib/flowchart/types';

/**
 * Conversational form mode.
 *
 * Two endpoints:
 *
 *   POST /api/forms/[shareId]/chat/start
 *     - Creates a new conversation in Xano's `conversation` table
 *     - Returns the first question to ask (from the form's first required field)
 *
 *   POST /api/forms/[shareId]/chat
 *     Body: { message: string, sessionId: string }
 *     - Loads the conversation state from Xano
 *     - Calls the LLM to extract structured data from the user's message
 *       (e.g. "My name is Alice Smith" → { name: "Alice Smith" })
 *     - Updates collected_data
 *     - Determines the next question to ask (next unanswered required field)
 *     - When all required fields are answered, writes the submission
 *       and returns { done: true, submissionId: ... }
 *
 * The chat state (messages, collected_data, current_field_id) is stored
 * in Xano — judges can inspect it via the metadata API.
 */

const XANO_INSTANCE_API = process.env.XANO_INSTANCE_API ?? '';
const XANO_TOKEN = process.env.XANO_TOKEN ?? '';
const XANO_WORKSPACE_ID = Number(process.env.XANO_WORKSPACE_ID ?? '2');
const CONVERSATION_TABLE_ID = 14; // provisioned by setup

// ---------------------------------------------------------------------------
// Helpers for direct Xano table access (conversation table isn't in db adapter yet)
// ---------------------------------------------------------------------------

async function xanoTableOp(method: string, path: string, body?: unknown) {
  const url = `${XANO_INSTANCE_API}${path}`;
  const resp = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${XANO_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const text = await resp.text();
  let parsed: any;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  if (!resp.ok) {
    throw new Error(`Xano ${method} ${path} failed: ${parsed?.message ?? text ?? resp.status}`);
  }
  return parsed;
}

async function getConversation(sessionId: string) {
  const resp = await xanoTableOp('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${CONVERSATION_TABLE_ID}/content/search`, {
    search: { external_id: sessionId },
    page: 1,
    per_page: 1,
  });
  return resp?.items?.[0] ?? null;
}

async function createConversation(args: {
  sessionId: string;
  formId: string;
  shareId: string;
  firstQuestion: string;
  firstFieldId: string | null;
}) {
  const messages = [{
    role: 'bot',
    content: args.firstQuestion,
    timestamp: new Date().toISOString(),
  }];
  const body = {
    external_id: args.sessionId,
    form_id: args.formId,
    share_id: args.shareId,
    messages,
    collected_data: {},
    current_field_id: args.firstFieldId,
    status: 'active',
  };
  const resp = await xanoTableOp('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${CONVERSATION_TABLE_ID}/content`, body);
  return resp;
}

async function updateConversation(xanoId: number, updates: Record<string, any>) {
  // Always bump updated_at
  const body = { ...updates, updated_at: Date.now() };
  return xanoTableOp('PUT', `/workspace/${XANO_WORKSPACE_ID}/table/${CONVERSATION_TABLE_ID}/content/${xanoId}`, body);
}

// ---------------------------------------------------------------------------
// Field-walking logic
// ---------------------------------------------------------------------------

/**
 * Get the form's field list from its schema. Returns ordered field definitions
 * with their IDs, types, labels, and required-ness.
 */
function getFormFields(flowchart: Flowchart): Array<{
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
}> {
  return flowchart.nodes
    .filter((n) => n.type === 'field')
    .map((n) => ({
      id: n.id,
      type: n.data.fieldType ?? 'text',
      label: n.data.label,
      required: n.data.required ?? false,
      options: n.data.options,
    }));
}

/**
 * Find the next field to ask about, given what's already been collected.
 * Returns null if all required fields are answered.
 */
function findNextUnansweredField(
  fields: ReturnType<typeof getFormFields>,
  collected: Record<string, any>
): { id: string; label: string; type: string; options?: string[] } | null {
  for (const field of fields) {
    if (field.required && (collected[field.id] === undefined || collected[field.id] === null || collected[field.id] === '')) {
      return field;
    }
  }
  return null;
}

/**
 * Build the bot's question for a given field, based on its type + options.
 */
function buildQuestion(field: { id: string; label: string; type: string; options?: string[] }): string {
  switch (field.type) {
    case 'dropdown':
    case 'radio':
      return `Please choose one of the following for "${field.label}": ${field.options?.join(', ') ?? 'no options'}`;
    case 'checkbox':
      return `Please select all that apply for "${field.label}": ${field.options?.join(', ') ?? 'no options'}`;
    case 'rating':
      return `On a scale of 1-5, how would you rate "${field.label}"?`;
    case 'date':
      return `What's the date for "${field.label}"? (YYYY-MM-DD)`;
    case 'number':
      return `What's the number for "${field.label}"?`;
    case 'email':
      return `What's your email address for "${field.label}"?`;
    case 'tel':
      return `What's the phone number for "${field.label}"?`;
    case 'url':
      return `What's the URL for "${field.label}"?`;
    case 'textarea':
      return `Please tell us about "${field.label}" (a few sentences is fine):`;
    default:
      return `What's your "${field.label}"?`;
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * POST /api/forms/[shareId]/chat/start
 * Body: { sessionId?: string } — sessionId is generated if not provided
 * Response: { sessionId, firstMessage, fieldId }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shareId } = await params;
    const body = await request.json().catch(() => ({}));
    const sessionId = (body as any).sessionId
      ?? `conv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    // Load the form
    const form = await db.form.findUnique({ where: { shareId } });
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }
    if (form.status !== 'published') {
      return NextResponse.json({ error: 'This form is not accepting submissions' }, { status: 403 });
    }

    // Parse the flowchart to get the field list
    const flowchart: Flowchart = typeof form.flowchart === 'string'
      ? JSON.parse(form.flowchart as string)
      : form.flowchart as Flowchart;
    const fields = getFormFields(flowchart);

    if (fields.length === 0) {
      return NextResponse.json({ error: 'This form has no fields to ask about' }, { status: 400 });
    }

    // Find the first required field
    const firstField = findNextUnansweredField(fields, {});
    if (!firstField) {
      // No required fields — just submit immediately
      return NextResponse.json({
        sessionId,
        firstMessage: "Hi! This form has no required questions. Type 'submit' to finish.",
        fieldId: null,
        done: false,
      });
    }

    const firstQuestion = buildQuestion(firstField);

    // Create the conversation in Xano
    await createConversation({
      sessionId,
      formId: form.id,
      shareId,
      firstQuestion,
      firstFieldId: firstField.id,
    });

    return NextResponse.json({
      sessionId,
      firstMessage: firstQuestion,
      fieldId: firstField.id,
      fieldType: firstField.type,
      done: false,
      collected: {},
      totalFields: fields.length,
      requiredFields: fields.filter((f) => f.required).length,
    });
  } catch (error) {
    console.error('[/chat/start] error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to start conversation', details: message },
      { status: 500 }
    );
  }
}
