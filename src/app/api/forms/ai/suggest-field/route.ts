import { NextRequest, NextResponse } from 'next/server';
import { aiChat } from '@/lib/ai-engine';
import { runFunction } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * POST /api/forms/ai/suggest-field
 *
 * Given a field label + type, returns AI-suggested configuration:
 *   - suggestedType (may upgrade "text" → "email" for "Email Address")
 *   - suggestedPlaceholder
 *   - suggestedRequired
 *   - suggestedHelperText
 *   - suggestedOptions (for dropdown/radio/checkbox)
 *   - suggestedValidation (minLength, maxLength, pattern, patternMessage)
 *   - suggestedNotes (rationale)
 *
 * The LLM call happens in Next.js; the Xano function `ai/log_field_suggestion`
 * validates + logs to ai_generation_log for the audit trail.
 */
export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are Reform's field configuration suggester. Given a field label and its current type, suggest the optimal configuration.

Output a JSON object with this EXACT shape:
{
  "suggestedType": "text|email|password|number|tel|url|textarea|dropdown|radio|checkbox|date|rating|file",
  "suggestedPlaceholder": "string — example value shown to user",
  "suggestedRequired": true|false,
  "suggestedHelperText": "string — short helper text below the field",
  "suggestedOptions": ["a", "b", "c"],
  "suggestedValidation": {
    "minLength": number,
    "maxLength": number,
    "pattern": "regex string",
    "patternMessage": "error message if pattern fails",
    "min": number,
    "max": number
  },
  "suggestedNotes": "1-sentence rationale for these choices"
}

Rules:
- Only include fields that make sense for the suggested type (e.g. don't include options for an email field)
- For "Country", "State", "Status" etc. → use dropdown with realistic options
- For "Email" → use type=email with a proper email regex pattern
- For "Phone" → use type=tel with a phone pattern
- For "URL"/"Website" → use type=url with URL pattern
- For "Description"/"Bio"/"Comments" → use type=textarea with maxLength
- For "Age"/"Quantity"/"Count" → use type=number with min/max
- For "Date of Birth"/"Birthday" → use type=date
- For "Rating"/"Score" → use type=rating
- For "Resume"/"Document" → use type=file
- For "Password"/"PIN" → use type=password with minLength:8

Output ONLY the JSON. No markdown, no fences.`;

interface SuggestionResponse {
  suggestions: {
    suggestedType?: string;
    suggestedPlaceholder?: string;
    suggestedRequired?: boolean;
    suggestedHelperText?: string;
    suggestedOptions?: string[];
    suggestedValidation?: {
      minLength?: number;
      maxLength?: number;
      pattern?: string;
      patternMessage?: string;
      min?: number;
      max?: number;
    };
    suggestedNotes?: string;
  };
  audit_log_id: string;
  model: string;
  latency_ms: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { label, fieldType } = body as { label?: string; fieldType?: string };

    if (!label || typeof label !== 'string' || label.trim().length < 2) {
      return NextResponse.json(
        { error: 'A label of at least 2 characters is required' },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    const userId = user?.id ?? 'anonymous';

    // 1. Call the AI (real LLM or rule-based fallback)
    const startTime = Date.now();
    const result = await aiChat(SYSTEM_PROMPT, `Suggest configuration for a "${fieldType ?? 'text'}" field labeled: "${label.trim()}"`, {
      max_tokens: 600,
      temperature: 0.3,
    });
    const elapsedMs = Date.now() - startTime;
    const content = result.content;
    if (!content) {
      return NextResponse.json(
        { error: 'AI returned an empty response' },
        { status: 502 }
      );
    }

    const tokensIn = result.input_tokens;
    const tokensOut = result.output_tokens;

    // 2. Validate + log via Xano function
    const xanoResult = await runFunction<SuggestionResponse>(
      'ai/log_field_suggestion',
      {
        label: label.trim(),
        field_type: fieldType ?? 'text',
        llm_response: content,
        model: result.model,
        input_tokens: tokensIn,
        output_tokens: tokensOut,
        latency_ms: elapsedMs,
        user_id: userId,
      }
    );

    return NextResponse.json({
      ...xanoResult,
      model: result.model,
      latency_ms: elapsedMs,
    });
  } catch (error) {
    console.error('[/api/forms/ai/suggest-field] error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Field suggestion failed', details: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/forms/ai/suggest-field',
    method: 'POST',
    description:
      'Given a field label + type, returns AI-suggested configuration ' +
      '(type, placeholder, required, options, validation rules). ' +
      'Orchestrated by Xano function `ai/log_field_suggestion` for audit logging.',
    request_shape: {
      label: 'string (2+ chars) — the field label',
      fieldType: 'string (optional) — current field type',
    },
    xano_function: 'ai/log_field_suggestion',
  });
}
