import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db, runFunction } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { Flowchart, FlowNode } from '@/lib/flowchart/types';

/**
 * POST /api/forms/[id]/translate
 * Body: { language: string }  // ISO 639-1 code: es, fr, de, pt, zh, ja, etc.
 *
 * Translates all field labels, placeholders, helper text, and dropdown
 * options to the target language. Stores the result in Xano's
 * form_translation table.
 *
 * Architecture:
 *   1. Verify form ownership + parse the flowchart
 *   2. Collect all translatable strings (label, placeholder, helperText, options)
 *   3. Single LLM call with all strings → returns JSON map of original→translated
 *   4. Persist in Xano's form_translation table (one row per (form, language))
 *   5. Also log to ai_generation_log via the Xano function 'ai/log_field_suggestion'
 */

export const runtime = 'nodejs';

const XANO_INSTANCE_API = process.env.XANO_INSTANCE_API ?? '';
const XANO_TOKEN = process.env.XANO_TOKEN ?? '';
const XANO_WORKSPACE_ID = Number(process.env.XANO_WORKSPACE_ID ?? '2');
const FORM_TRANSLATION_TABLE_ID = 11; // form_translation

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

interface TranslationResult {
  translationId: string;
  auditLogId: string;
  language: string;
  translatedCount: number;
  translations: Record<string, string>;
  model: string;
  latency_ms: number;
}

const SYSTEM_PROMPT = `You are a form translation engine. Given a JSON object of translatable strings and a target language, return a JSON object mapping each original string to its translation.

Rules:
- Translate naturally, not literally (e.g. "Name" → "Nombre" in Spanish, not "Nomo")
- Keep field labels short (max 5 words)
- Keep placeholders as examples (e.g. "you@example.com" stays the same in any language)
- For dropdown options, translate culturally (e.g. "United States" → "Estados Unidos" in Spanish)
- Preserve any HTML entities or special characters
- Do NOT translate email addresses, URLs, or technical identifiers

Output ONLY a JSON object: { "original string 1": "translation 1", "original string 2": "translation 2" }
No markdown, no fences, no commentary.`;

const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  it: 'Italian',
  nl: 'Dutch',
  ru: 'Russian',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  sw: 'Swahili',
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const form = await db.form.findFirst({ where: { id: formId, ownerId: user.id } });
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

    const body = await request.json();
    const { language } = body as { language?: string };
    if (!language || !/^[a-z]{2}$/i.test(language)) {
      return NextResponse.json(
        { error: 'language must be a 2-letter ISO 639-1 code (e.g. es, fr, de)' },
        { status: 400 }
      );
    }
    const langCode = language.toLowerCase();
    const langName = LANGUAGE_NAMES[langCode] ?? langCode;

    // Parse the flowchart
    const flowchart: Flowchart = typeof form.flowchart === 'string'
      ? JSON.parse(form.flowchart as string)
      : form.flowchart as Flowchart;

    // Collect all translatable strings (deduped)
    const stringsToTranslate = new Set<string>();
    for (const node of flowchart.nodes as FlowNode[]) {
      if (node.type === 'field') {
        if (node.data.label) stringsToTranslate.add(node.data.label);
        if (node.data.placeholder) stringsToTranslate.add(node.data.placeholder);
        if (node.data.helperText) stringsToTranslate.add(node.data.helperText);
        if (node.data.options) {
          for (const opt of node.data.options) stringsToTranslate.add(opt);
        }
      } else if (node.type === 'submit' || node.type === 'start') {
        if (node.data.label) stringsToTranslate.add(node.data.label);
      }
    }

    if (stringsToTranslate.size === 0) {
      return NextResponse.json(
        { error: 'This form has no translatable strings' },
        { status: 400 }
      );
    }

    // Single LLM call with all strings
    const stringsArray = Array.from(stringsToTranslate);
    const zai = await ZAI.create();
    const startTime = Date.now();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Target language: ${langName} (${langCode})

Translatable strings JSON:
${JSON.stringify(stringsArray, null, 2)}`,
        },
      ],
      thinking: { type: 'disabled' },
      max_tokens: 2000,
      temperature: 0.3,
    });
    const elapsedMs = Date.now() - startTime;
    const content = completion.choices?.[0]?.message?.content ?? '';
    if (!content) {
      return NextResponse.json({ error: 'AI returned an empty response' }, { status: 502 });
    }

    // Parse the translation map
    let translations: Record<string, string>;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      translations = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI translation response', raw: content.slice(0, 300) },
        { status: 502 }
      );
    }

    // Persist in Xano (delete any existing translation for this form+language first)
    // Step 1: search for existing
    const existingSearch = await xanoTableOp('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${FORM_TRANSLATION_TABLE_ID}/content/search`, {
      filter: { form_id: formId, language: langCode },
      page: 1,
      per_page: 1,
    });
    const existing = existingSearch?.items?.[0];
    if (existing) {
      // Delete the old translation
      await xanoTableOp('DELETE', `/workspace/${XANO_WORKSPACE_ID}/table/${FORM_TRANSLATION_TABLE_ID}/content/${existing.id}`);
    }

    // Step 2: insert the new one
    const translationId = `ftrn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const insertResp = await xanoTableOp('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${FORM_TRANSLATION_TABLE_ID}/content`, {
      external_id: translationId,
      form_id: formId,
      language: langCode,
      translations,
      model: 'glm-4.5',
    });

    // Audit-log via Xano function
    let auditLogId = '';
    try {
      const auditResult = await runFunction<{ audit_log_id: string }>('ai/log_field_suggestion', {
        label: `translate form ${formId} to ${langCode}`,
        field_type: 'translation',
        llm_response: JSON.stringify({ translations, count: Object.keys(translations).length }),
        model: 'glm-4.5',
        input_tokens: Math.ceil((SYSTEM_PROMPT.length + stringsArray.join('').length) / 4),
        output_tokens: Math.ceil(content.length / 4),
        latency_ms: elapsedMs,
        user_id: user.id,
      });
      auditLogId = auditResult.audit_log_id;
    } catch (e) {
      console.error('[translate] audit log failed:', e);
    }

    return NextResponse.json({
      translationId,
      auditLogId,
      language: langCode,
      languageName: langName,
      translatedCount: Object.keys(translations).length,
      translations,
      model: 'glm-4.5',
      latency_ms: elapsedMs,
    } as TranslationResult);
  } catch (error) {
    console.error('[/translate] error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Translation failed', details: message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params;
    const lang = request.nextUrl.searchParams.get('lang');
    if (!lang) {
      return NextResponse.json({
        endpoint: '/api/forms/[id]/translate',
        method: 'POST',
        description: 'Translate all field labels, placeholders, options to a target language.',
        request_shape: { language: 'ISO 639-1 code (es, fr, de, pt, zh, ja, etc.)' },
        supported_languages: Object.keys(LANGUAGE_NAMES),
      });
    }

    // Return the stored translation for this form + language
    const resp = await xanoTableOp('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${FORM_TRANSLATION_TABLE_ID}/content/search`, {
      filter: { form_id: formId, language: lang.toLowerCase() },
      page: 1,
      per_page: 1,
    });
    const item = resp?.items?.[0];
    if (!item) {
      return NextResponse.json({ error: 'No translation found for this language' }, { status: 404 });
    }
    const translations = typeof item.translations === 'string' ? JSON.parse(item.translations) : item.translations;
    return NextResponse.json({
      language: item.language,
      translations,
      model: item.model,
      created_at: new Date(item.created_at).toISOString(),
    });
  } catch (error) {
    console.error('[GET /translate] error:', error);
    return NextResponse.json({ error: 'Failed to fetch translation' }, { status: 500 });
  }
}
