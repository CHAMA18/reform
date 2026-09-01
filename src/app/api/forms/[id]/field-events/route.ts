import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/forms/[id]/field-events
 *
 * Records a UX event for a field (focus, blur, input, submit, abandon).
 * Used by the AI drop-off analyzer to figure out where users are getting
 * stuck. Events are stored in Xano's field_event table (id=13).
 *
 * Body: {
 *   sessionId: string,    — anonymous browser session ID
 *   fieldId: string,       — node ID in the flowchart
 *   eventType: 'focus'|'blur'|'input'|'submit'|'abandon',
 *   valueLength?: number, — length of the field value at the event
 *   timeOnFieldMs?: number, — time spent on the field (focus → blur)
 * }
 */

const XANO_INSTANCE_API = process.env.XANO_INSTANCE_API ?? '';
const XANO_TOKEN = process.env.XANO_TOKEN ?? '';
const XANO_WORKSPACE_ID = Number(process.env.XANO_WORKSPACE_ID ?? '2');
const FIELD_EVENT_TABLE_ID = 13;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params;
    const body = await request.json();
    const { sessionId, fieldId, eventType, valueLength, timeOnFieldMs } = body as {
      sessionId?: string;
      fieldId?: string;
      eventType?: string;
      valueLength?: number;
      timeOnFieldMs?: number;
    };

    if (!sessionId || !fieldId || !eventType) {
      return NextResponse.json(
        { error: 'sessionId, fieldId, and eventType are required' },
        { status: 400 }
      );
    }

    const validEventTypes = ['focus', 'blur', 'input', 'submit', 'abandon'];
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: `eventType must be one of: ${validEventTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify the form exists
    const form = await db.form.findFirst({ where: { id: formId } });
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Insert into Xano's field_event table
    const eventId = `fevn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const createBody = {
      external_id: eventId,
      form_id: formId,
      field_id: fieldId,
      event_type: eventType,
      session_id: sessionId,
      value_length: valueLength ?? 0,
      time_on_field_ms: timeOnFieldMs ?? 0,
      occurred_at: Date.now(),
    };

    const url = `${XANO_INSTANCE_API}/workspace/${XANO_WORKSPACE_ID}/table/${FIELD_EVENT_TABLE_ID}/content`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${XANO_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(createBody),
      cache: 'no-store',
    });
    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        { error: 'Failed to record event', details: text.slice(0, 200) },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, eventId });
  } catch (error) {
    console.error('[/field-events] error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to record event', details: message }, { status: 500 });
  }
}

/**
 * GET /api/forms/[id]/field-events — list events for analysis (debugging).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params;
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
        sort: { occurred_at: 'desc' },
        page: 1,
        per_page: 100,
      }),
      cache: 'no-store',
    });
    if (!resp.ok) {
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
    const data = await resp.json();
    return NextResponse.json({
      events: (data?.items ?? []).map((item: any) => ({
        id: item.external_id,
        fieldId: item.field_id,
        eventType: item.event_type,
        sessionId: item.session_id,
        valueLength: item.value_length,
        timeOnFieldMs: item.time_on_field_ms,
        occurredAt: new Date(item.occurred_at).toISOString(),
      })),
      total: data?.itemsTotal ?? 0,
    });
  } catch (error) {
    console.error('[GET /field-events] error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
