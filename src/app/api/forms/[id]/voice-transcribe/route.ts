import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runFunction } from '@/lib/db';

/**
 * POST /api/forms/[id]/voice-transcribe
 * Body: { audio: base64-encoded audio data, shareId: string }
 *
 * Transcribes spoken audio into text using a local Whisper-compatible
 * ASR service. Used by the voice-first submission mode.
 *
 * The audio is recorded in the browser via MediaRecorder (WebM/Opus),
 * sent here as base64, and converted to text. The text is then sent
 * through the same conversational-form extraction pipeline.
 *
 * Supports:
 *   - Local Whisper server (http://localhost:9000/v1/audio/transcriptions)
 *   - OpenAI Whisper API compatible endpoints
 *   - Whisper.cpp server
 *
 * Env vars:
 *   ASR_BASE_URL — Base URL of the ASR server (default: http://localhost:9000)
 *   ASR_API_KEY  — API key for the ASR server (optional for local)
 */
export const runtime = 'nodejs';

const ASR_BASE_URL = process.env.ASR_BASE_URL ?? 'http://localhost:9000';
const ASR_API_KEY = process.env.ASR_API_KEY ?? '';

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

    // Verify the form exists + is published (skip if Xano not configured)
    const hasXano = process.env.XANO_TOKEN && !process.env.XANO_TOKEN.includes('placeholder') && process.env.XANO_INSTANCE_API && !process.env.XANO_INSTANCE_API.includes('placeholder');
    if (hasXano) {
      if (shareId) {
        const form = await db.form.findUnique({ where: { shareId } });
        if (!form) {
          return NextResponse.json({ error: 'Form not found' }, { status: 404 });
        }
        if (form.status !== 'published') {
          return NextResponse.json({ error: 'Form not accepting submissions' }, { status: 403 });
        }
      } else {
        const form = await db.form.findFirst({ where: { id: formId } });
        if (!form) {
          return NextResponse.json({ error: 'Form not found' }, { status: 404 });
        }
      }
    }

    const startTime = Date.now();

    // Try local Whisper ASR
    let transcription = '';
    try {
      transcription = await transcribeWithWhisper(base64Data);
    } catch (asrError) {
      console.error('[voice-transcribe] Whisper ASR failed:', asrError);
      return NextResponse.json(
        {
          error: 'Voice transcription unavailable. Ensure a local Whisper server is running.',
          details: `ASR server at ${ASR_BASE_URL} is not reachable. Start it with: whisper-server --port 9000`,
          setup_hint: 'Install: pip install faster-whisper && faster-whisper-server --port 9000',
        },
        { status: 503 }
      );
    }

    const elapsedMs = Date.now() - startTime;

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
        model: 'whisper-local',
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
    return NextResponse.json({ error: 'Transcription failed', details: message }, { status: 500 });
  }
}

/**
 * Transcribe audio using a local Whisper-compatible server.
 *
 * Supports the OpenAI Whisper API format:
 *   POST /v1/audio/transcriptions
 *   Body: multipart/form-data with "file" field
 *
 * Or Whisper.cpp server format:
 *   POST /inference
 *   Body: multipart/form-data with "file" field
 */
async function transcribeWithWhisper(base64Audio: string): Promise<string> {
  // Convert base64 to Buffer
  const audioBuffer = Buffer.from(base64Audio, 'base64');

  // Create a Blob for the multipart form
  const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });

  // Try OpenAI-compatible endpoint first
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  const headers: Record<string, string> = {};
  if (ASR_API_KEY) {
    headers['Authorization'] = `Bearer ${ASR_API_KEY}`;
  }

  // Try OpenAI-compatible endpoint
  try {
    const resp = await fetch(`${ASR_BASE_URL}/v1/audio/transcriptions`, {
      method: 'POST',
      headers,
      body: formData,
      signal: AbortSignal.timeout(30_000), // 30s timeout
    });

    if (resp.ok) {
      const result = await resp.json();
      return result.text ?? '';
    }
  } catch {
    // Fall through to next endpoint
  }

  // Try Whisper.cpp server format
  try {
    const resp = await fetch(`${ASR_BASE_URL}/inference`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30_000),
    });

    if (resp.ok) {
      const result = await resp.json();
      return result.text ?? result.transcription ?? '';
    }
  } catch {
    // Fall through
  }

  throw new Error(`No ASR endpoint responded at ${ASR_BASE_URL}`);
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/forms/[id]/voice-transcribe',
    method: 'POST',
    description:
      'Transcribes spoken audio into text using a local Whisper ASR server. ' +
      'Used by the voice-first submission mode.',
    request_shape: {
      audio: 'base64-encoded audio data (WebM/Opus from MediaRecorder)',
      shareId: 'string — form share ID',
    },
    setup: {
      'Option 1 (faster-whisper)': 'pip install faster-whisper && faster-whisper-server --port 9000',
      'Option 2 (whisper.cpp)': 'whisper-server --port 9000 --model base',
      env_var: 'ASR_BASE_URL=http://localhost:9000',
    },
  });
}
