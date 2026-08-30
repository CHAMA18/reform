import { NextRequest, NextResponse } from 'next/server';
import { aiChat } from '@/lib/ai-engine';
import { runFunction } from '@/lib/db';
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
 *   2. Next.js invokes the LLM via z-ai-web-dev-sdk
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
export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are Reform's form generation engine. Given a natural-language description, output a JSON object with this EXACT shape:

{
  "name": "<short, descriptive form name>",
  "description": "<1-2 sentence summary of what the form does>",
  "flowchart": {
    "nodes": [<FlowNode>...],
    "edges": [<FlowEdge>...]
  },
  "fieldNotes": "<optional notes about the chosen fields>"
}

Node shape: { "id": "n1", "type": "start"|"field"|"condition"|"submit", "position": {"x": 0, "y": 0}, "data": {...} }
  - start node data: { "label": "Start" }
  - field node data: { "fieldType": "text"|"email"|"number"|"tel"|"url"|"textarea"|"dropdown"|"radio"|"checkbox"|"date"|"rating"|"file", "label": "Field label", "placeholder": "placeholder text", "required": true|false, "options": ["a","b","c"] (for dropdown/radio/checkbox only) }
  - condition node data: { "label": "Condition description", "conditionField": "<node_id of field to evaluate>", "conditionOperator": "=="|"!="|">"|"<"|"contains", "conditionValue": "<value to compare>" }
  - submit node data: { "label": "Submit" }

Edge shape: { "id": "e1", "source": "n1", "target": "n2", "label": "optional", "branch": "true"|"false" (for condition edges only) }

Rules:
- The flowchart MUST have exactly one "start" node and at least one "submit" node
- Layout nodes vertically with increasing y values (y=0, y=150, y=300, etc.) and x=0
- Use unique ids like "n1", "n2", "n3"... and edge ids like "e1", "e2"...
- For dropdown/radio/checkbox fields, include realistic options
- For conditional logic, use a "condition" node and branch edges

Output ONLY the JSON object. No markdown fences, no commentary, no leading/trailing text.`;

interface GenerateResponse {
  flowchart: unknown;
  name: string;
  description: string;
  field_notes?: string;
  model: string;
  latency_ms: number;
  audit_log_id: string;
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
      max_tokens: 2000,
      temperature: 0.7,
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

    // 2. Call Xano to validate the LLM output and log the invocation
    //    The Xano function does the schema validation (start node, submit
    //    node, etc.) and inserts a row into ai_generation_log.
    const validated = await runFunction<GenerateResponse>(
      'ai/validate_and_log_form',
      {
        prompt: prompt.trim(),
        user_id: userId,
        llm_response: content,
        model: 'glm-4.5',
        input_tokens: tokensIn,
        output_tokens: tokensOut,
        latency_ms: elapsedMs,
      }
    );

    return NextResponse.json(validated);
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
      'The LLM call uses z-ai-web-dev-sdk; the result is validated and ' +
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
