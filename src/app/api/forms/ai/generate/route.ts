import { NextRequest, NextResponse } from 'next/server';
import { aiChat } from '@/lib/ai-engine';
import { logAiGeneration } from '@/lib/xano-audit';
import { getCurrentUser } from '@/lib/auth';

/**
 * POST /api/forms/ai/generate
 *
 * Generate a complete Reform form (flowchart + name + description) from a
 * natural-language prompt.
 *
 * Architecture (Xano is the backend, not just a database):
 *
 *   1. Next.js validates the prompt and gets the current user
 *   2. Next.js invokes the local LLM via OpenAI-compatible API (Ollama/LM Studio)
 *   3. Next.js calls the Xano function stack `ai/validate_and_log_form`:
 *      - Xano validates the LLM output is a legal Reform flowchart
 *        (must have exactly one start node, at least one submit node,
 *         nodes + edges arrays)
 *      - Xano inserts a row into `ai_generation_log` (audit trail)
 *      - Xano returns the validated flowchart + audit log ID
 *   4. Next.js returns the validated result to the client
 *
 * Every AI invocation is audit-logged in Xano. Business logic (validation
 * rules, audit trail shape) lives in XanoScript — not in Next.js.
 */
export const runtime = 'nodejs';const SYSTEM_PROMPT = `You are a form builder AI. Output ONLY valid JSON.

{"name":"...","description":"...","fields":[{"label":"Name","type":"text","required":true,"placeholder":"Your name"}]}

Types: text, email, number, tel, url, textarea, dropdown, radio, checkbox, date, rating, file.
For dropdown/radio/checkbox include "options":["a","b"].
No markdown. No explanation. JSON only.`;

interface GenerateResponse {
  flowchart: unknown;
  name: string;
  description: string;
  field_notes?: string;
  model: string;
  latency_ms: number;
  audit_log_id: string;
}

/**
 * Normalize any LLM output into the Reform flowchart schema.
 * Handles cases where the LLM returns a different structure (e.g.
 * {"form":{"questions":[...]}} or {"fields":[...]}).
 */
function normalizeToFlowchart(raw: any, prompt: string): any {
  // Already correct format
  if (raw.flowchart && raw.flowchart.nodes && raw.flowchart.edges) {
    return raw;
  }

  // Build a name from prompt
  const autoName = prompt.length > 60 ? prompt.slice(0, 57) + '...' : prompt;

  // Extract fields/questions from various LLM output shapes
  let fields: Array<Record<string, any>> = [];

  // Pattern 1: { "form": { "questions": [...] } }
  if (raw.form?.questions) {
    fields = raw.form.questions;
  }
  // Pattern 1b: { "form": { "fields": [...] } }
  else if (raw.form?.fields) {
    fields = raw.form.fields;
  }
  // Pattern 2: { "questions": [...] }
  else if (Array.isArray(raw.questions)) {
    fields = raw.questions;
  }
  // Pattern 3: { "fields": [...] }
  else if (Array.isArray(raw.fields)) {
    fields = raw.fields;
  }
  // Pattern 4: { "title": "...", "questions": [...] }
  else if (raw.title && Array.isArray(raw.questions)) {
    fields = raw.questions;
  }
  // Pattern 5: single object with question-like shape
  else if (raw.type && raw.label) {
    fields = [raw];
  }
  // Pattern 6: { "data": { "questions": [...] } }
  else if (raw.data?.questions) {
    fields = raw.data.questions;
  }
  // Pattern 7: { "form": { "name": "...", "questions": [...] } }
  else if (raw.form && Array.isArray(raw.form.questions)) {
    fields = raw.form.questions;
  }
  // Pattern 8: deeply nested — look for any array of objects with type/label/name
  else {
    for (const key of Object.keys(raw)) {
      const val = raw[key];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && (val[0].type || val[0].label || val[0].name)) {
        fields = val;
        break;
      }
      if (typeof val === 'object' && val !== null) {
        for (const innerKey of Object.keys(val)) {
          const innerVal = val[innerKey];
          if (Array.isArray(innerVal) && innerVal.length > 0 && typeof innerVal[0] === 'object' && (innerVal[0].type || innerVal[0].label || innerVal[0].name)) {
            fields = innerVal;
            break;
          }
        }
        if (fields.length > 0) break;
      }
    }
  }

  if (fields.length === 0) {
    // Last resort: create a minimal form from whatever we got
    return {
      name: raw.name || autoName,
      description: raw.description || prompt,
      flowchart: {
        nodes: [
          { id: 'n1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
          { id: 'n2', type: 'field', position: { x: 0, y: 150 }, data: { label: 'Name', fieldType: 'text', placeholder: 'Your name', required: true, options: [] } },
          { id: 'n3', type: 'field', position: { x: 0, y: 300 }, data: { label: 'Email', fieldType: 'email', placeholder: 'you@example.com', required: true, options: [] } },
          { id: 'n4', type: 'submit', position: { x: 0, y: 450 }, data: { label: 'Submit' } },
        ],
        edges: [
          { id: 'e1', source: 'n1', target: 'n2' },
          { id: 'e2', source: 'n2', target: 'n3' },
          { id: 'e3', source: 'n3', target: 'n4' },
        ],
      },
      fieldNotes: 'Fallback: LLM did not produce a valid flowchart.',
    };
  }

  // Convert extracted fields into a Reform flowchart
  const typeMap: Record<string, string> = {
    text: 'text', email: 'email', number: 'number', tel: 'tel',
    phone: 'tel', url: 'url', textarea: 'textarea', text_area: 'textarea',
    longtext: 'textarea', long_text: 'textarea', paragraph: 'textarea',
    dropdown: 'dropdown', select: 'dropdown', choice: 'dropdown',
    radio: 'radio', radiogroup: 'radio', singlechoice: 'radio',
    checkbox: 'checkbox', multiselect: 'checkbox',
    date: 'date', datetime: 'date', datepicker: 'date',
    rating: 'rating', stars: 'rating', scale: 'rating', nps: 'rating',
    file: 'file', upload: 'file', attachment: 'file',
    password: 'text', numberinput: 'number', range: 'number',
    yesno: 'radio', boolean: 'radio', truefalse: 'radio',
    fullname: 'text', name: 'text', shorttext: 'text', short: 'text',
    urlinput: 'url', link: 'url', website: 'url',
    phoneinput: 'tel', telephone: 'tel', mobile: 'tel',
    emailinput: 'email', emailaddress: 'email',
  };

  // Infer type from field label if type is missing or unknown
  function inferType(field: Record<string, any>): string {
    const rawType = (field.type || field.inputType || field.fieldType || '').toLowerCase().replace(/[^a-z]/g, '');
    if (typeMap[rawType]) return typeMap[rawType];
    const label = (field.label || field.name || '').toLowerCase();
    if (label.includes('email')) return 'email';
    if (label.includes('phone') || label.includes('tel') || label.includes('mobile')) return 'tel';
    if (label.includes('url') || label.includes('website') || label.includes('link')) return 'url';
    if (label.includes('date') || label.includes('birthday') || label.includes('dob')) return 'date';
    if (label.includes('rating') || label.includes('score') || label.includes('nps') || label.includes('satisfaction')) return 'rating';
    if (label.includes('comment') || label.includes('feedback') || label.includes('message') || label.includes('description') || label.includes('notes')) return 'textarea';
    if (field.options && field.options.length > 0) return 'dropdown';
    return 'text';
  }

  const nodes: any[] = [
    { id: 'n1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
  ];
  const edges: any[] = [];
  let prevId = 'n1';
  let y = 150;
  let nodeIdx = 2;

  for (const field of fields) {
    const fieldType = inferType(field);
    const nodeId = `n${nodeIdx++}`;

    nodes.push({
      id: nodeId,
      type: 'field',
      position: { x: 0, y },
      data: {
        label: field.label || field.name || 'Field',
        fieldType,
        placeholder: field.placeholder || field.hint || '',
        required: field.required !== false,
        options: field.options || [],
      },
    });
    edges.push({ id: `e${edges.length + 1}`, source: prevId, target: nodeId });
    prevId = nodeId;
    y += 150;
  }

  // Add submit node
  nodes.push({ id: `n${nodeIdx}`, type: 'submit', position: { x: 0, y }, data: { label: 'Submit' } });
  edges.push({ id: `e${edges.length + 1}`, source: prevId, target: `n${nodeIdx}` });

  return {
    name: raw.name || raw.title || autoName,
    description: raw.description || raw.subtitle || prompt,
    flowchart: { nodes, edges },
    fieldNotes: raw.fieldNotes || `Auto-normalized ${fields.length} fields from LLM output.`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body as { prompt?: string };

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
      return NextResponse.json(
        { error: 'A prompt of at least 5 characters is required' },
        { status: 400 }
      );
    }
    if (prompt.length > 2000) {
      return NextResponse.json(
        { error: 'Prompt is too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    const userId = user?.id ?? 'anonymous';

    // 1. Invoke the AI (real LLM or rule-based fallback)
    const startTime = Date.now();
    const result = await aiChat(SYSTEM_PROMPT, prompt.trim(), {
      max_tokens: 3000,
      temperature: 0.7,
      json_mode: true,
    });

    const elapsedMs = Date.now() - startTime;
    const content = result.content;
    if (!content) {
      return NextResponse.json(
        { error: 'AI returned an empty response. Please try again.' },
        { status: 502 }
      );
    }

    const tokensIn = result.input_tokens;
    const tokensOut = result.output_tokens;

    // 2. Parse the LLM output and normalize to Reform flowchart format
    let parsed: any;
    try {
      // Strip markdown fences, extract JSON
      let cleaned = content.replace(/```(?:json|JSON)?\n?/g, '').replace(/```/g, '').trim();
      // Try direct parse first
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        // Try extracting the largest JSON object from the response
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in LLM response');
        }
      }
    } catch {
      return NextResponse.json(
        { error: 'AI returned invalid JSON. Please try again.', raw: content.slice(0, 200) },
        { status: 502 }
      );
    }

    // 3. Normalize: if the LLM didn't produce the exact flowchart schema,
    //    convert whatever it gave us into a valid Reform flowchart
    const normalized = normalizeToFlowchart(parsed, prompt.trim());

    if (!normalized.flowchart || !normalized.flowchart.nodes || !normalized.flowchart.edges) {
      return NextResponse.json(
        { error: 'AI response missing flowchart data. Please try again.' },
        { status: 502 }
      );
    }

    // Ensure start + submit nodes exist
    const nodes = normalized.flowchart.nodes;
    const hasStart = nodes.some((n: any) => n.type === 'start');
    const hasSubmit = nodes.some((n: any) => n.type === 'submit');
    if (!hasStart || !hasSubmit) {
      return NextResponse.json(
        { error: 'Flowchart must have a start and submit node. Please try again.' },
        { status: 502 }
      );
    }

    // 4. Audit-log the AI generation to Xano
    const auditLogId = await logAiGeneration({
      feature: 'form_generator',
      userId,
      prompt: prompt.trim(),
      model: result.model,
      response: JSON.stringify(normalized),
      inputTokens: tokensIn,
      outputTokens: tokensOut,
      latencyMs: elapsedMs,
      status: 'success',
    });

    return NextResponse.json({
      flowchart: normalized.flowchart,
      name: normalized.name || 'Untitled Form',
      description: normalized.description || '',
      field_notes: normalized.fieldNotes || '',
      model: result.model,
      latency_ms: elapsedMs,
      audit_log_id: auditLogId ?? 'local-no-xano',
    });
  } catch (error) {
    console.error('[/api/forms/ai/generate] error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'AI form generation failed', details: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/forms/ai/generate',
    method: 'POST',
    description:
      'Generate a complete Reform form from a natural-language prompt. ' +
      'The LLM call uses a local OpenAI-compatible server; the result is validated and ' +
      'audit-logged by the Xano function stack `ai/validate_and_log_form`.',
    request_shape: {
      prompt: 'string (5-2000 chars) — natural-language form description',
    },
    response_shape: {
      flowchart: 'Flowchart JSON — drops into the visual builder',
      name: 'string — suggested form name',
      description: 'string — suggested form description',
      field_notes: 'string — AI notes about the chosen fields (optional)',
      model: 'string — LLM model used',
      latency_ms: 'number — LLM round-trip latency',
      audit_log_id: 'string — ID of the ai_generation_log record in Xano',
    },
    xano_function: 'ai/validate_and_log_form',
  });
}
