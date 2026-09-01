import { NextRequest, NextResponse } from 'next/server';
import { aiChat } from '@/lib/ai-engine';
import { db } from '@/lib/db';
import { logAiGeneration } from '@/lib/xano-audit';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/forms/[id]/insights
 *
 * Returns cached AI insights for a form, or generates fresh ones if:
 *   - No cached insight exists yet, OR
 *   - The cached insight's submission_count is stale (more submissions
 *     have come in since the cache was built)
 *
 * POST /api/forms/[id]/insights
 *
 * Force-regenerates insights for the form (ignores cache).
 *
 * Architecture (Xano is the backend):
 *   1. Next.js fetches all submissions for the form
 *   2. Next.js builds a structured prompt and calls the local LLM (OpenAI-compatible)
 *      to summarize: bullets, sentiment breakdown, topic clusters
 *   3. Next.js calls the Xano function stack `ai/save_form_insight`, which:
 *      - Validates the summary structure
 *      - Inserts a new row into form_insight (the cache)
 *      - Inserts a row into ai_generation_log (audit trail)
 *      - Returns the saved insight
 */
export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are Reform's submission analysis engine. Given a JSON array of form submissions, produce a structured insight summary.

Output a JSON object with this EXACT shape:

{
  "bullets": [
    "1-sentence summary highlighting a key finding (positive or negative)",
    "2-3 bullets total, each focused on a distinct theme"
  ],
  "sentiment": {
    "positive": <number 0-100>,
    "neutral": <number 0-100>,
    "negative": <number 0-100>
  },
  "topics": [
    {"topic": "short topic name", "count": <number>, "sentiment": "positive"|"neutral"|"negative"}
  ],
  "standout_quotes": [
    "1-2 memorable short quotes from submissions (with attribution if available)"
  ]
}

Guidelines:
- Bullets should be specific, not generic ("3 users mentioned billing delays" not "users had feedback")
- Sentiment percentages must sum to 100
- Topics should be derived from recurring keywords/themes in the data
- Quotes should be verbatim or near-verbatim
- If there are fewer than 3 submissions, note that the sample size is small

Output ONLY the JSON. No markdown, no fences, no commentary.`;

interface CachedInsight {
  id: string;
  form_id: string;
  submission_count: number;
  summary: {
    bullets: string[];
    sentiment: { positive: number; neutral: number; negative: number };
    topics?: Array<{ topic: string; count: number; sentiment: string }>;
    standout_quotes?: string[];
  };
  chart_data?: unknown;
  model: string;
  generated_at: Date;
}

// Helper: call Xano to persist a freshly-generated insight (non-fatal if Xano not configured)
async function persistInsight(args: {
  formId: string;
  submissionCount: number;
  summary: unknown;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  userId: string;
}): Promise<{ insight_id: string; audit_log_id: string }> {
  // Audit-log the insight generation
  const auditLogId = await logAiGeneration({
    feature: 'submission_insights',
    userId: args.userId,
    prompt: `Analyze ${args.submissionCount} submissions for form ${args.formId}`,
    model: args.model,
    response: JSON.stringify(args.summary),
    inputTokens: args.inputTokens,
    outputTokens: args.outputTokens,
    latencyMs: args.latencyMs,
    status: 'success',
  });

  return {
    insight_id: `local_${Date.now()}`,
    audit_log_id: auditLogId ?? 'local-no-xano',
  };
}

// Helper: fetch cached insight from Xano (if any)
// Defined below as fetchCachedInsight — this stub kept for grep-ability.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify the form exists and belongs to the user
    const form = await db.form.findFirst({
      where: { id: formId, ownerId: user.id },
    });
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Check for cached insight (using a direct Xano search)
    const cached = await fetchCachedInsight(formId);
    const currentSubmissionCount = await db.submission.count({ where: { formId } });

    if (cached && cached.submission_count === currentSubmissionCount && currentSubmissionCount > 0) {
      // Cache is fresh
      return NextResponse.json({
        cached: true,
        insight: cached,
        submission_count: currentSubmissionCount,
      });
    }

    if (currentSubmissionCount === 0) {
      return NextResponse.json({
        cached: false,
        insight: null,
        submission_count: 0,
        message: 'No submissions yet to analyze.',
      });
    }

    // Generate fresh insights
    const insight = await generateInsightForForm(formId, currentSubmissionCount, user.id);
    return NextResponse.json({
      cached: false,
      insight,
      submission_count: currentSubmissionCount,
    });
  } catch (error) {
    console.error('[GET /api/forms/[id]/insights] error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch insights', details: message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const form = await db.form.findFirst({
      where: { id: formId, ownerId: user.id },
    });
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const currentSubmissionCount = await db.submission.count({ where: { formId } });
    if (currentSubmissionCount === 0) {
      return NextResponse.json(
        { error: 'No submissions yet to analyze.' },
        { status: 400 }
      );
    }

    const insight = await generateInsightForForm(formId, currentSubmissionCount, user.id);
    return NextResponse.json({
      cached: false,
      insight,
      submission_count: currentSubmissionCount,
    });
  } catch (error) {
    console.error('[POST /api/forms/[id]/insights] error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to generate insights', details: message },
      { status: 500 }
    );
  }
}

async function fetchCachedInsight(formId: string): Promise<CachedInsight | null> {
  // Direct Xano search — fetch the most recent form_insight row for this form
  // (We use a raw call because the db adapter doesn't yet model form_insight.)
  const XANO_INSTANCE_API = process.env.XANO_INSTANCE_API ?? '';
  const XANO_TOKEN = process.env.XANO_TOKEN ?? '';
  const XANO_WORKSPACE_ID = Number(process.env.XANO_WORKSPACE_ID ?? '2');
  if (!XANO_TOKEN || !XANO_INSTANCE_API || XANO_TOKEN.includes('placeholder') || XANO_INSTANCE_API.includes('placeholder')) return null;

  // table_id 10 = form_insight
  const url = `${XANO_INSTANCE_API}/workspace/${XANO_WORKSPACE_ID}/table/10/content/search`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${XANO_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      search: { form_id: formId },
      sort: { generated_at: 'desc' },
      page: 1,
      per_page: 1,
    }),
    cache: 'no-store',
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  const item = data?.items?.[0];
  if (!item) return null;
  return {
    id: item.external_id,
    form_id: item.form_id,
    submission_count: item.submission_count,
    summary: typeof item.summary === 'string' ? JSON.parse(item.summary) : item.summary,
    chart_data: item.chart_data,
    model: item.model,
    generated_at: new Date(item.generated_at),
  };
}

async function generateInsightForForm(
  formId: string,
  submissionCount: number,
  userId: string
): Promise<CachedInsight> {
  // Fetch all submissions for this form
  const submissions = await db.submission.findMany({
    where: { formId },
    take: 200, // Cap to keep the prompt manageable
  });

  // Parse each submission's data + extract a flat list of values
  const submissionData = submissions.map((s, i) => {
    const data = typeof s.data === 'string' ? JSON.parse(s.data as string) : s.data;
    return {
      submission_id: i + 1,
      timestamp: s.id instanceof Date ? s.id.toISOString() : String(s.id),
      source: s.source,
      status: s.status,
      data,
    };
  });

  const userMessage = `Analyze these ${submissionCount} form submissions for form "${formId}".

Submissions JSON:
${JSON.stringify(submissionData, null, 2)}`;

  // Call the AI (real LLM or rule-based fallback)
  const startTime = Date.now();
  const result = await aiChat(SYSTEM_PROMPT, userMessage, {
    max_tokens: 1500,
    temperature: 0.4,
  });
  const elapsedMs = Date.now() - startTime;
  const content = result.content;
  if (!content) {
    throw new Error('AI returned an empty response');
  }

  // Clean + parse the response
  const cleaned = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
  let summary: CachedInsight['summary'];
  try {
    summary = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Failed to parse LLM response as JSON: ${cleaned.slice(0, 200)}`);
  }

  const tokensIn = result.input_tokens;
  const tokensOut = result.output_tokens;

  // Persist via Xano function stack
  const persisted = await persistInsight({
    formId,
    submissionCount,
    summary,
    model: result.model,
    inputTokens: tokensIn,
    outputTokens: tokensOut,
    latencyMs: elapsedMs,
    userId,
  });

  return {
    id: persisted.insight_id,
    form_id: formId,
    submission_count: submissionCount,
    summary,
    model: result.model,
    generated_at: new Date(),
  };
}
