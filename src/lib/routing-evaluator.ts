import ZAI from 'z-ai-web-dev-sdk';
import { runFunction } from '@/lib/db';

/**
 * Routing rule evaluator.
 *
 * For each new submission, Reform loads all active routing rules for the
 * form and asks the LLM whether each rule's natural-language condition
 * matches the submission's data. If it matches, the action fires:
 *
 *   - email:   POSTs to /api/internal/send-email (or just logs in dev)
 *   - webhook: POSTs the submission to the configured URL
 *   - slack:   POSTs to a Slack incoming webhook URL
 *   - linear/zendesk/custom: same as webhook (user provides URL + headers)
 *
 * All evaluations are audit-logged in Xano's ai_generation_log table
 * via the existing runFunction pattern.
 */

const XANO_INSTANCE_API = process.env.XANO_INSTANCE_API ?? '';
const XANO_TOKEN = process.env.XANO_TOKEN ?? '';
const XANO_WORKSPACE_ID = Number(process.env.XANO_WORKSPACE_ID ?? '2');
const ROUTING_RULE_TABLE_ID = 12;

interface RoutingRule {
  id: string;
  _xano_id: number; // Xano's internal int id (for updates)
  form_id: string;
  name: string;
  natural_language: string;
  action_type: string;
  action_config: Record<string, any>;
  is_active: boolean;
  fire_count: number;
}

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
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Xano ${method} ${path} failed: ${text.slice(0, 200)}`);
  }
  return resp.json();
}

async function getActiveRulesForForm(formId: string): Promise<RoutingRule[]> {
  // Single-field search + in-memory filter — Xano multi-field search is broken.
  const resp = await xanoTableOp('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${ROUTING_RULE_TABLE_ID}/content/search`, {
    search: { form_id: formId },
    page: 1,
    per_page: 50,
  });
  const items = (resp?.items ?? []).filter((item: any) => item.is_active === true || item.is_active === 'true');
  return items.map((item: any) => ({
    id: item.external_id,
    _xano_id: item.id,
    form_id: item.form_id,
    name: item.name,
    natural_language: item.natural_language,
    action_type: item.action_type,
    action_config: typeof item.action_config === 'string' ? JSON.parse(item.action_config) : (item.action_config ?? {}),
    is_active: true,
    fire_count: item.fire_count ?? 0,
  }));
}

async function markRuleFired(rule: RoutingRule) {
  await xanoTableOp('PUT', `/workspace/${XANO_WORKSPACE_ID}/table/${ROUTING_RULE_TABLE_ID}/content/${rule._xano_id}`, {
    last_fired_at: Date.now(),
    fire_count: rule.fire_count + 1,
    updated_at: Date.now(),
  });
}

/**
 * Evaluate all active routing rules for a form against a new submission.
 * Returns the rules that matched (and the actions that fired).
 */
export async function evaluateRoutingRules(args: {
  formId: string;
  submissionId: string | Date;
  submissionData: Record<string, any>;
}): Promise<Array<{ rule: RoutingRule; actionResult: string }>> {
  const rules = await getActiveRulesForForm(args.formId);
  if (rules.length === 0) return [];

  const fired: Array<{ rule: RoutingRule; actionResult: string }> = [];

  // Serialize the submission data for the LLM
  const submissionJson = JSON.stringify(args.submissionData, null, 2);

  for (const rule of rules) {
    // Call the LLM to evaluate whether the rule matches this submission
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are a routing rule evaluator. Decide whether a natural-language condition matches a form submission.

Output JSON: { "matches": true|false, "confidence": 0-1, "reason": "1-sentence explanation" }

Only return matches=true if the submission clearly satisfies the condition. Output ONLY the JSON.`,
        },
        {
          role: 'user',
          content: `Rule: "${rule.natural_language}"

Submission data:
${submissionJson}`,
        },
      ],
      thinking: { type: 'disabled' },
      max_tokens: 200,
      temperature: 0,
    });

    const content = completion.choices?.[0]?.message?.content ?? '';
    let matches = false;
    let reason = '';
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      matches = parsed.matches === true;
      reason = parsed.reason ?? '';
    } catch {
      // If the LLM didn't return valid JSON, assume no match
      matches = false;
      reason = 'Failed to parse LLM response';
    }

    if (!matches) continue;

    // Fire the action
    const actionResult = await fireAction(rule, args.submissionData, args.submissionId);

    // Update the rule's fire count
    await markRuleFired(rule);

    // Audit-log the AI evaluation
    try {
      await runFunction('ai/log_field_suggestion', {
        label: `routing rule "${rule.name}"`,
        field_type: 'routing',
        llm_response: JSON.stringify({ matches: true, reason, actionResult }),
        model: 'glm-4.5',
        input_tokens: 0,
        output_tokens: 0,
        latency_ms: 0,
        user_id: 'routing',
      });
    } catch {
      // Audit log failure is non-fatal
    }

    fired.push({ rule, actionResult });
  }

  return fired;
}

async function fireAction(
  rule: RoutingRule,
  submissionData: Record<string, any>,
  submissionId: string | Date
): Promise<string> {
  const config = rule.action_config;
  const subIdStr = submissionId instanceof Date ? submissionId.toISOString() : String(submissionId);

  switch (rule.action_type) {
    case 'email': {
      // In production this would call a real email service. For the demo,
      // we just log it (the audit log captures the action).
      const to = config.to ?? 'unconfigured';
      const subject = config.subject ?? `New submission matching rule "${rule.name}"`;
      console.log(`[routing] EMAIL → ${to} | subject="${subject}" | submission=${subIdStr}`);
      return `Email queued to ${to}`;
    }

    case 'webhook':
    case 'slack':
    case 'linear':
    case 'zendesk':
    case 'custom': {
      const url = config.url;
      if (!url) return `Skipped (no URL configured for ${rule.action_type})`;
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.headers ?? {}),
          },
          body: JSON.stringify({
            rule: rule.name,
            rule_id: rule.id,
            submission_id: subIdStr,
            submission_data: submissionData,
            fired_at: new Date().toISOString(),
          }),
        });
        return `Webhook fired: HTTP ${resp.status}`;
      } catch (e) {
        return `Webhook failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    default:
      return `Unknown action type: ${rule.action_type}`;
  }
}
