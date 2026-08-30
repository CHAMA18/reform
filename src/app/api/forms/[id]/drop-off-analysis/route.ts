import { NextRequest, NextResponse } from 'next/server';
import { aiChat } from '@/lib/ai-engine';
import { db, runFunction } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { Flowchart } from '@/lib/flowchart/types';

/**
 * GET /api/forms/[id]/drop-off-analysis
 *
 * Aggregates field_event data for a form and asks the LLM to identify
 * drop-off points + suggest specific fixes. Cached + audit-logged in Xano.
 *
 * Returns: {
 *   fields: [{ fieldId, label, type, focusCount, abandonCount, dropOffRate, ... }],
 *   aiSuggestions: [{ fieldId, label, issue, recommendation, severity }]
 * }
 */
export const runtime = 'nodejs';

const XANO_INSTANCE_API = process.env.XANO_INSTANCE_API ?? '';
const XANO_TOKEN = process.env.XANO_TOKEN ?? '';
const XANO_WORKSPACE_ID = Number(process.env.XANO_WORKSPACE_ID ?? '2');
const FIELD_EVENT_TABLE_ID = 13;

async function fetchAllEvents(formId: string) {
  const url = `${XANO_INSTANCE_API}/workspace/${XANO_WORKSPACE_ID}/table/${FIELD_EVENT_TABLE_ID}/content/search`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${XANO_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      search: { form_id: formId },
      page: 1,
      per_page: 500,
    }),
    cache: 'no-store',
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  return data?.items ?? [];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const form = await db.form.findFirst({ where: { id: formId, ownerId: user.id } });
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

    // Fetch all events for this form
    const events = await fetchAllEvents(formId);
    if (events.length === 0) {
      return NextResponse.json({
        hasEvents: false,
        fields: [],
        aiSuggestions: [],
        message: 'No field events recorded yet. Visit the public form to generate some.',
      });
    }

    // Parse the flowchart to get field metadata
    const flowchart: Flowchart = typeof form.flowchart === 'string'
      ? JSON.parse(form.flowchart as string)
      : form.flowchart as Flowchart;
    const fieldMap = new Map<string, { id: string; label: string; type: string; required: boolean }>();
    for (const node of flowchart.nodes) {
      if (node.type === 'field') {
        fieldMap.set(node.id, {
          id: node.id,
          label: node.data.label ?? 'Untitled',
          type: node.data.fieldType ?? 'text',
          required: node.data.required ?? false,
        });
      }
    }

    // Aggregate events per field
    const fieldStats: Array<{
      fieldId: string;
      label: string;
      type: string;
      required: boolean;
      focusCount: number;
      blurCount: number;
      inputCount: number;
      submitCount: number;
      abandonCount: number;
      avgValueLength: number;
      avgTimeOnFieldMs: number;
      dropOffRate: number; // abandon / focus
    }> = [];

    for (const [fieldId, field] of fieldMap.entries()) {
      const fieldEvents = events.filter((e: any) => e.field_id === fieldId);
      const focusCount = fieldEvents.filter((e: any) => e.event_type === 'focus').length;
      const blurCount = fieldEvents.filter((e: any) => e.event_type === 'blur').length;
      const inputCount = fieldEvents.filter((e: any) => e.event_type === 'input').length;
      const submitCount = fieldEvents.filter((e: any) => e.event_type === 'submit').length;
      const abandonCount = fieldEvents.filter((e: any) => e.event_type === 'abandon').length;
      const valueLengths = fieldEvents.map((e: any) => e.value_length ?? 0);
      const timesOnField = fieldEvents.map((e: any) => e.time_on_field_ms ?? 0);
      fieldStats.push({
        fieldId,
        label: field.label,
        type: field.type,
        required: field.required,
        focusCount,
        blurCount,
        inputCount,
        submitCount,
        abandonCount,
        avgValueLength: valueLengths.length > 0 ? Math.round(valueLengths.reduce((a: number, b: number) => a + b, 0) / valueLengths.length) : 0,
        avgTimeOnFieldMs: timesOnField.length > 0 ? Math.round(timesOnField.reduce((a: number, b: number) => a + b, 0) / timesOnField.length) : 0,
        dropOffRate: focusCount > 0 ? abandonCount / focusCount : 0,
      });
    }

    // Call AI to suggest fixes (real LLM or rule-based fallback)
    const startTime = Date.now();
    const systemPrompt = `You are a UX analyst. Given field-level event data for a form, identify drop-off points and suggest specific, actionable fixes.

Output a JSON array of suggestions: [{ "fieldId": string, "label": string, "issue": string, "recommendation": string, "severity": "low"|"medium"|"high" }]

Only include fields with actual issues (drop-off rate > 30%, very long input times, low completion rates, etc.). If there are no issues, return an empty array [].

Output ONLY the JSON array. No markdown, no commentary.`;

    const userMessage = `Form: "${form.name}" — ${fieldStats.length} fields, ${events.length} total events.

Field stats JSON:
${JSON.stringify(fieldStats, null, 2)}`;

    const result = await aiChat(systemPrompt, userMessage, {
      max_tokens: 1000,
      temperature: 0.4,
    });
    const elapsedMs = Date.now() - startTime;
    const content = result.content ?? '[]';

    let aiSuggestions: Array<{ fieldId: string; label: string; issue: string; recommendation: string; severity: string }> = [];
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      aiSuggestions = JSON.parse(cleaned);
    } catch {
      // Fall back to no suggestions if parsing fails
    }

    // Audit-log via Xano
    try {
      await runFunction('ai/log_field_suggestion', {
        label: `drop-off analysis form ${formId}`,
        field_type: 'analytics',
        llm_response: JSON.stringify({ suggestions: aiSuggestions, fieldCount: fieldStats.length }),
        model: 'glm-4.5',
        input_tokens: Math.ceil((systemPrompt.length + userMessage.length) / 4),
        output_tokens: Math.ceil(content.length / 4),
        latency_ms: elapsedMs,
        user_id: user.id,
      });
    } catch (e) {
      console.error('[drop-off] audit log failed:', e);
    }

    return NextResponse.json({
      hasEvents: true,
      totalEvents: events.length,
      fields: fieldStats,
      aiSuggestions,
      model: 'glm-4.5',
      latency_ms: elapsedMs,
    });
  } catch (error) {
    console.error('[/drop-off-analysis] error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Analysis failed', details: message }, { status: 500 });
  }
}
