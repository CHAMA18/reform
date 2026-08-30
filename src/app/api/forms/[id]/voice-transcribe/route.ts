import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { runFunction } from '@/lib/db';

/**
 * POST /api/forms/[id]/voice-transcribe
 * Body: { audio: base64-encoded audio data, shareId: string }
 *
 * Transcribes spoken audio into text using z-ai-web-dev-sdk's ASR
 * service. Used by the voice-first submission mode.
 *
 * The audio is recorded in the browser via MediaRecorder (WebM/Opus),
 * sent here as base64, and converted to text. The text is then sent
 * through the same conversational-form extraction pipeline.
 */
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params;
    const body = await request.json();
    const { audio, shareId } = body as { audio?: string; shareId?: string };

    if (!audio || typeof audio !== 'string') {
      return NextResponse.json({ error: 'Audio data (base64) is required' }, { status: 400 });
    }

    // Strip the data URL prefix if present (e.g. "data:audio/webm;base64,...")
    const base64Data = audio.replace(/^data:audio\/[^;]+;base64,/, '');

    // Verify the form exists + is published
    if (shareId) {
      const form = await db.form.findUnique({ where: { shareId } });
      if (!form) {
        return NextResponse.json({ error: 'Form not found' }, { status: 404 });
      }
      if (form.status !== 'published') {
        return NextResponse.json({ error: 'Form not accepting submissions' }, { status: 403 });
      }
    } else {
      // Verify by formId
      const form = await db.form.findFirst({ where: { id: formId } });
      if (!form) {
        return NextResponse.json({ error: 'Form not found' }, { status: 404 });
      }
    }

    const startTime = Date.now();
    const zai = await ZAI.create();
    const response = await zai.audio.asr.create({
      file_base64: base64Data,
    });
    const elapsedMs = Date.now() - startTime;

    const transcription = response.text ?? '';
    if (!transcription || !transcription.trim()) {
      return NextResponse.json(
        { error: 'No speech detected in the audio. Please try again.' },
        { status: 422 }
      );
    }

    // Audit-log the transcription via Xano
    let auditLogId = '';
    try {
      const auditResult = await runFunction<{ audit_log_id: string }>('ai/log_field_suggestion', {
        label: `voice transcription form ${formId}`,
        field_type: 'voice',
        llm_response: JSON.stringify({ transcription, audio_size_bytes: base64Data.length }),
        model: 'asr-glm',
        input_tokens: 0,
        output_tokens: Math.ceil(transcription.length / 4),
        latency_ms: elapsedMs,
        user_id: 'voice',
      });
      auditLogId = auditResult.audit_log_id;
    } catch (e) {
      console.error('[voice-transcribe] audit log failed:', e);
    }

    return NextResponse.json({
      transcription: transcription.trim(),
      latency_ms: elapsedMs,
      audit_log_id: auditLogId,
    });
  } catch (error) {
    console.error('[/voice-transcribe] error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Transcription failed', details: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/forms/[id]/voice-transcribe',
    method: 'POST',
    description:
      'Transcribes spoken audio into text using z-ai-web-dev-sdk ASR. ' +
      'Used by the voice-first submission mode.',
    request_shape: {
      audio: 'base64-encoded audio data (WebM/Opus from MediaRecorder)',
      shareId: 'string — form share ID',
    },
  });
}
