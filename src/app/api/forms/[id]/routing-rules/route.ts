import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * Routing rules for a form — natural-language conditions evaluated by AI
 * on each submission.
 *
 *   GET  /api/forms/[id]/routing-rules        — list rules for the form
 *   POST /api/forms/[id]/routing-rules        — create a new rule
 *
 * Example rule body:
 *   {
 *     "name": "Billing complaint → finance",
 *     "naturalLanguage": "If the feedback mentions billing or pricing issues, send to finance@acme.com",
 *     "actionType": "email",
 *     "actionConfig": { "to": "finance@acme.com", "subject": "Billing complaint" }
 *   }
 */

const XANO_INSTANCE_API = process.env.XANO_INSTANCE_API ?? '';
const XANO_TOKEN = process.env.XANO_TOKEN ?? '';
const XANO_WORKSPACE_ID = Number(process.env.XANO_WORKSPACE_ID ?? '2');
const ROUTING_RULE_TABLE_ID = 12; // form_routing_rule

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

interface RoutingRule {
  id: string;
  form_id: string;
  name: string;
  natural_language: string;
  parsed_condition?: unknown;
  action_type: 'email' | 'webhook' | 'slack' | 'linear' | 'zendesk' | 'custom';
  action_config: Record<string, any>;
  is_active: boolean;
  last_fired_at?: string | null;
  fire_count: number;
  created_at: string;
}

function xanoToApp(item: any): RoutingRule {
  return {
    id: item.external_id,
    form_id: item.form_id,
    name: item.name,
    natural_language: item.natural_language,
    parsed_condition: typeof item.parsed_condition === 'string' ? JSON.parse(item.parsed_condition) : item.parsed_condition,
    action_type: item.action_type,
    action_config: typeof item.action_config === 'string' ? JSON.parse(item.action_config) : (item.action_config ?? {}),
    is_active: item.is_active === true || item.is_active === 'true',
    last_fired_at: item.last_fired_at ? new Date(item.last_fired_at).toISOString() : null,
    fire_count: item.fire_count ?? 0,
    created_at: new Date(item.created_at).toISOString(),
  };
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

    const resp = await xanoTableOp('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${ROUTING_RULE_TABLE_ID}/content/search`, {
      filter: { form_id: formId },
      sort: { created_at: 'desc' },
      page: 1,
      per_page: 50,
    });
    const rules = (resp?.items ?? []).map(xanoToApp);
    return NextResponse.json({ rules });
  } catch (error) {
    console.error('[GET routing-rules] error:', error);
    return NextResponse.json({ error: 'Failed to fetch routing rules' }, { status: 500 });
  }
}

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
    const { name, naturalLanguage, actionType, actionConfig } = body as {
      name?: string;
      naturalLanguage?: string;
      actionType?: string;
      actionConfig?: Record<string, any>;
    };

    if (!name || !naturalLanguage || !actionType) {
      return NextResponse.json(
        { error: 'name, naturalLanguage, and actionType are required' },
        { status: 400 }
      );
    }

    const validActionTypes = ['email', 'webhook', 'slack', 'linear', 'zendesk', 'custom'];
    if (!validActionTypes.includes(actionType)) {
      return NextResponse.json(
        { error: `actionType must be one of: ${validActionTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Create the rule in Xano
    const ruleId = `frrl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const createBody = {
      external_id: ruleId,
      form_id: formId,
      name: name.trim(),
      natural_language: naturalLanguage.trim(),
      parsed_condition: null, // We don't pre-parse — the LLM evaluates on each submission
      action_type: actionType,
      action_config: actionConfig ?? {},
      is_active: true,
      fire_count: 0,
    };
    const resp = await xanoTableOp('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${ROUTING_RULE_TABLE_ID}/content`, createBody);
    return NextResponse.json({ rule: xanoToApp(resp) });
  } catch (error) {
    console.error('[POST routing-rules] error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to create routing rule', details: message }, { status: 500 });
  }
}
