/**
 * Xano Audit Logger — writes directly to the ai_generation_log table.
 *
 * This bypasses Xano function stacks and writes audit entries directly
 * via the Metadata API content endpoints. Every AI invocation in the
 * app should call `logAiGeneration()` so the audit trail is complete.
 *
 * Table 9: ai_generation_log
 * Columns: external_id, feature, user_id, prompt, model, response,
 *          input_tokens, output_tokens, latency_ms, status, error_message
 */

const XANO_INSTANCE_API = process.env.XANO_INSTANCE_API ?? '';
const XANO_TOKEN = process.env.XANO_TOKEN ?? '';
const XANO_WORKSPACE_ID = Number(process.env.XANO_WORKSPACE_ID ?? '2');
const AI_LOG_TABLE_ID = 9;

// Only log when real Xano is configured
const isXanoReady =
  XANO_TOKEN &&
  !XANO_TOKEN.includes('placeholder') &&
  XANO_INSTANCE_API &&
  !XANO_INSTANCE_API.includes('placeholder');

/**
 * Log an AI generation event to Xano's ai_generation_log table.
 *
 * @param entry - The audit log entry
 * @returns The Xano record ID, or null if logging failed (non-fatal)
 */
export async function logAiGeneration(entry: {
  feature: string;         // e.g. "form_generator", "submission_insights", "smart_routing"
  userId?: string;
  prompt: string;
  model: string;
  response: string;        // the AI output (truncated to 10000 chars for storage)
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  status: 'success' | 'error';
  errorMessage?: string;
}): Promise<string | null> {
  if (!isXanoReady) return null;

  try {
    const externalId = `aig_${crypto.randomUUID().slice(0, 8)}-${crypto.randomUUID().slice(9, 13)}-${crypto.randomUUID().slice(14, 18)}-${crypto.randomUUID().slice(19, 23)}-${crypto.randomUUID().slice(24)}`;

    const payload = {
      external_id: externalId,
      feature: entry.feature,
      user_id: entry.userId ?? 'anonymous',
      prompt: entry.prompt.slice(0, 2000),
      model: entry.model,
      response: entry.response.slice(0, 10000),
      input_tokens: entry.inputTokens,
      output_tokens: entry.outputTokens,
      latency_ms: entry.latencyMs,
      status: entry.status,
      error_message: entry.errorMessage?.slice(0, 500) ?? '',
      created_at: Date.now(),
    };

    const url = `${XANO_INSTANCE_API}/workspace/${XANO_WORKSPACE_ID}/table/${AI_LOG_TABLE_ID}/content`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XANO_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error(`[xano-audit] Failed to log: ${resp.status} ${text.slice(0, 200)}`);
      return null;
    }

    const result = await resp.json();
    console.log(`[xano-audit] Logged ${entry.feature} → Xano id=${result.id}`);
    return result.id?.toString() ?? null;
  } catch (err) {
    console.error('[xano-audit] Error logging to Xano:', err);
    return null;
  }
}
