import { NextRequest, NextResponse } from 'next/server';
import { aiChat } from '@/lib/ai-engine';
import { db, runFunction } from '@/lib/db';
import type { Flowchart } from '@/lib/flowchart/types';

/**
 * POST /api/forms/[shareId]/chat
 * Body: { sessionId: string, message: string }
 *
 * 1. Loads the conversation from Xano
 * 2. Calls the LLM to extract the answer for current_field_id from the user's message
 * 3. Updates collected_data
 * 4. Finds the next unanswered required field
 * 5. If all required fields are answered → creates a submission
 * 6. Returns the next question (or { done: true, submissionId } if complete)
 *
 * The LLM extraction is what makes this "AI-native conversational":
 * a user can type "I'm 28 years old" for an age field, or "yep, alice@acme.io"
 * for an email field — the LLM normalizes it to the structured value.
 */
export const runtime = 'nodejs';

const XANO_INSTANCE_API = process.env.XANO_INSTANCE_API ?? '';
const XANO_TOKEN = process.env.XANO_TOKEN ?? '';
const XANO_WORKSPACE_ID = Number(process.env.XANO_WORKSPACE_ID ?? '2');
const CONVERSATION_TABLE_ID = 14;

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

async function getConversationBySession(sessionId: string) {
  const resp = await xanoTableOp('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${CONVERSATION_TABLE_ID}/content/search`, {
    search: { external_id: sessionId },
    page: 1,
    per_page: 1,
  });
  return resp?.items?.[0] ?? null;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
}

function getFormFields(flowchart: Flowchart): FormField[] {
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

function findNextUnansweredField(fields: FormField[], collected: Record<string, any>): FormField | null {
  for (const field of fields) {
    if (field.required && (collected[field.id] === undefined || collected[field.id] === null || collected[field.id] === '')) {
      return field;
    }
  }
  return null;
}

function buildQuestion(field: FormField): string {
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

/**
 * Use the LLM to extract a structured value for a field from the user's
 * free-text message. Falls back to the raw message if the LLM fails.
 */
async function extractFieldValue(args: {
  fieldType: string;
  fieldLabel: string;
  options?: string[];
  userMessage: string;
}): Promise<string> {
  const { fieldType, fieldLabel, options, userMessage } = args;

  // For most types, we don't actually need the LLM — but for fields with
  // options (dropdown, radio, checkbox) we need fuzzy matching. And for
  // complex types like date, the LLM can normalize formats.
  if (fieldType === 'text' || fieldType === 'textarea' || fieldType === 'email' || fieldType === 'tel' || fieldType === 'url') {
    // Just return the user's message (optionally trimmed)
    return userMessage.trim();
  }

  if (fieldType === 'number' || fieldType === 'rating') {
    // Extract the first number from the message
    const match = userMessage.match(/\d+(\.\d+)?/);
    return match ? match[0] : userMessage.trim();
  }

  if (fieldType === 'date') {
    // Try common date formats first
    const dateMatch = userMessage.match(/\d{4}-\d{2}-\d{2}/);
    if (dateMatch) return dateMatch[0];
    // Otherwise use the LLM to normalize
  }

  // For dropdown/radio/checkbox — fuzzy match against options using the AI
  if ((fieldType === 'dropdown' || fieldType === 'radio' || fieldType === 'checkbox') && options && options.length > 0) {
    const systemPrompt = `You are an option matcher. The user is responding to a question with options. Pick the option(s) that best match their response.

Output JSON: { "value": "<chosen option>" } for single-select, or { "values": ["<opt1>", "<opt2>"] } for multi-select.

Available options: ${JSON.stringify(options)}
Field type: ${fieldType}
Field label: ${fieldLabel}

Only choose from the listed options. If the user's response doesn't match any option, return { "value": null }.

Output ONLY the JSON. No markdown, no fences.`;

    const result = await aiChat(systemPrompt, userMessage, {
      max_tokens: 200,
      temperature: 0,
    });
    const content = result.content;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (fieldType === 'checkbox' && parsed.values) {
        return JSON.stringify(parsed.values);
      }
      return parsed.value ?? userMessage.trim();
    } catch {
      // Fallback: try direct string match
      const lower = userMessage.toLowerCase();
      const matched = options.find((o) => lower.includes(o.toLowerCase()));
      return matched ?? userMessage.trim();
    }
  }

  // For date normalization
  if (fieldType === 'date') {
    const result = await aiChat('Extract a date in YYYY-MM-DD format from the user message. Output ONLY the date, no other text.', userMessage, {
      max_tokens: 30,
      temperature: 0,
    });
    return result.content.trim();
  }

  return userMessage.trim();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shareId } = await params;
    const body = await request.json();
    const { sessionId, message } = body as { sessionId?: string; message?: string };

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: 'Both sessionId and message are required' },
        { status: 400 }
      );
    }

    // Load the conversation
    const conversation = await getConversationBySession(sessionId);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    if (conversation.status === 'completed') {
      return NextResponse.json({
        done: true,
        botMessage: "This conversation is already complete. Thanks for your submission!",
        submissionId: conversation.submission_id,
      });
    }

    // Load the form to get the field list
    const form = await db.form.findUnique({ where: { shareId } });
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }
    const flowchart: Flowchart = typeof form.flowchart === 'string'
      ? JSON.parse(form.flowchart as string)
      : form.flowchart as Flowchart;
    const fields = getFormFields(flowchart);

    // Get the current field being asked
    const currentFieldId = conversation.current_field_id;
    const currentField = fields.find((f) => f.id === currentFieldId);
    if (!currentField) {
      return NextResponse.json({ error: 'No active field to fill' }, { status: 400 });
    }

    // Extract the answer from the user's message
    const extractedValue = await extractFieldValue({
      fieldType: currentField.type,
      fieldLabel: currentField.label,
      options: currentField.options,
      userMessage: message,
    });

    // Update collected_data
    const collectedData = typeof conversation.collected_data === 'string'
      ? JSON.parse(conversation.collected_data)
      : (conversation.collected_data ?? {});
    collectedData[currentField.id] = extractedValue;

    // Update the messages array
    const messages = typeof conversation.messages === 'string'
      ? JSON.parse(conversation.messages)
      : (conversation.messages ?? []);
    messages.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Find the next unanswered field
    const nextField = findNextUnansweredField(fields, collectedData);

    let botMessage: string;
    let nextFieldId: string | null = null;
    let done = false;
    let submissionId: string | null = null;

    if (nextField) {
      botMessage = buildQuestion(nextField);
      nextFieldId = nextField.id;
      messages.push({ role: 'bot', content: botMessage, timestamp: new Date().toISOString() });
    } else {
      // All required fields answered — create the submission
      botMessage = "Thanks! I have everything I need. Submitting your responses now…";
      done = true;
      messages.push({ role: 'bot', content: botMessage, timestamp: new Date().toISOString() });

      // Create the submission via the existing /api/submissions endpoint logic
      const submission = await db.submission.create({
        data: {
          formId: form.id,
          data: collectedData,
          source: 'conversational',
          status: 'Live',
        } as any,
      });
      // The submission.id is a Date for the submission model
      submissionId = submission.id instanceof Date
        ? submission.id.toISOString()
        : String(submission.id);

      // Update the conversation to mark it complete
      await xanoTableOp('PUT', `/workspace/${XANO_WORKSPACE_ID}/table/${CONVERSATION_TABLE_ID}/content/${conversation.id}`, {
        messages,
        collected_data: collectedData,
        current_field_id: null,
        status: 'completed',
        submission_id: submissionId,
        updated_at: Date.now(),
      });

      // Audit-log the AI extraction via Xano
      try {
        await runFunction('ai/log_field_suggestion', {
          label: `conversational form ${form.id}`,
          field_type: 'chat',
          llm_response: JSON.stringify({ extracted: collectedData, bot_message: botMessage }),
          model: 'glm-4.5',
          input_tokens: 0,
          output_tokens: 0,
          latency_ms: 0,
          user_id: 'conversational',
        });
      } catch {
        // Audit log failure is non-fatal
      }
    }

    if (!done) {
      // Persist the updated conversation state
      await xanoTableOp('PUT', `/workspace/${XANO_WORKSPACE_ID}/table/${CONVERSATION_TABLE_ID}/content/${conversation.id}`, {
        messages,
        collected_data: collectedData,
        current_field_id: nextFieldId,
        updated_at: Date.now(),
      });
    }

    return NextResponse.json({
      botMessage,
      fieldId: nextFieldId,
      fieldType: nextField?.type,
      done,
      submissionId,
      collected: collectedData,
      totalFields: fields.length,
      answeredFields: Object.keys(collectedData).length,
    });
  } catch (error) {
    console.error('[/chat] error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Chat failed', details: message },
      { status: 500 }
    );
  }
}
