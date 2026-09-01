'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/app-shell';

interface RoutingRule {
  id: string;
  form_id: string;
  name: string;
  natural_language: string;
  action_type: 'email' | 'webhook' | 'slack' | 'linear' | 'zendesk' | 'custom';
  action_config: Record<string, any>;
  is_active: boolean;
  last_fired_at?: string | null;
  fire_count: number;
  created_at: string;
}

interface RoutingRulesPanelProps {
  formId: string;
}

const ACTION_TYPES = [
  { value: 'email', label: 'Email', icon: 'mail', placeholder: 'finance@company.com' },
  { value: 'webhook', label: 'Webhook', icon: 'webhook', placeholder: 'https://api.example.com/notify' },
  { value: 'slack', label: 'Slack incoming webhook', icon: 'tag', placeholder: 'https://hooks.slack.com/services/...' },
  { value: 'custom', label: 'Custom', icon: 'code', placeholder: 'https://your-endpoint.com' },
];

export function RoutingRulesPanel({ formId }: RoutingRulesPanelProps) {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New rule form state
  const [name, setName] = useState('');
  const [naturalLanguage, setNaturalLanguage] = useState('');
  const [actionType, setActionType] = useState<RoutingRule['action_type']>('email');
  const [actionTarget, setActionTarget] = useState('');
  const [actionSubject, setActionSubject] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/forms/${formId}/routing-rules`, { cache: 'no-store' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setRules(data.rules ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  async function handleCreate() {
    if (!name.trim() || !naturalLanguage.trim() || !actionTarget.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const actionConfig: Record<string, any> =
        actionType === 'email'
          ? { to: actionTarget, subject: actionSubject || `New submission matching rule "${name}"` }
          : { url: actionTarget };

      const resp = await fetch(`/api/forms/${formId}/routing-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          naturalLanguage: naturalLanguage.trim(),
          actionType,
          actionConfig,
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${resp.status}`);
      }
      // Reset form
      setName('');
      setNaturalLanguage('');
      setActionTarget('');
      setActionSubject('');
      setShowForm(false);
      // Refresh rules
      await fetchRules();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="alt_route" className="text-[20px] text-rf-primary" />
            <h2 className="text-[18px] font-bold tracking-tight">AI Smart Routing</h2>
          </div>
          <p className="mt-1 text-[12px] text-rf-on-surface-variant">
            Write rules in plain English. Reform&apos;s AI evaluates them against each new submission and fires the matching action.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-bold"
        >
          <Icon name="add" className="text-[16px]" />
          New rule
        </button>
      </div>

      {/* New rule form */}
      {showForm && (
        <div className="rounded-2xl border border-rf-primary/30 bg-rf-primary/5 p-5">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                Rule name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Billing complaint → finance"
                className="w-full rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2 text-[13px] text-rf-on-surface placeholder:text-rf-on-surface-variant/40 focus:border-rf-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                Condition (natural language)
              </label>
              <textarea
                value={naturalLanguage}
                onChange={(e) => setNaturalLanguage(e.target.value)}
                rows={3}
                placeholder="e.g. If the feedback mentions billing, pricing, or refund, route to the finance team."
                className="w-full resize-y rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2 text-[13px] text-rf-on-surface placeholder:text-rf-on-surface-variant/40 focus:border-rf-primary focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                  Action type
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as RoutingRule['action_type'])}
                  className="w-full rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2 text-[13px] text-rf-on-surface focus:border-rf-primary focus:outline-none"
                >
                  {ACTION_TYPES.map((at) => (
                    <option key={at.value} value={at.value}>{at.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                  {actionType === 'email' ? 'Recipient email' : 'Target URL'}
                </label>
                <input
                  type="text"
                  value={actionTarget}
                  onChange={(e) => setActionTarget(e.target.value)}
                  placeholder={ACTION_TYPES.find((at) => at.value === actionType)?.placeholder ?? ''}
                  className="w-full rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2 text-[13px] text-rf-on-surface placeholder:text-rf-on-surface-variant/40 focus:border-rf-primary focus:outline-none"
                />
              </div>
            </div>
            {actionType === 'email' && (
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                  Email subject (optional)
                </label>
                <input
                  type="text"
                  value={actionSubject}
                  onChange={(e) => setActionSubject(e.target.value)}
                  placeholder="New submission matching rule"
                  className="w-full rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2 text-[13px] text-rf-on-surface placeholder:text-rf-on-surface-variant/40 focus:border-rf-primary focus:outline-none"
                />
              </div>
            )}
            {error && (
              <div className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-[11px] text-red-300">
                {error}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCreate}
                disabled={!name.trim() || !naturalLanguage.trim() || !actionTarget.trim() || creating}
                className="btn-primary rounded-lg px-4 py-2 text-[12px] font-bold disabled:opacity-40"
              >
                {creating ? 'Creating…' : 'Create rule'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-white/10 px-3 py-2 text-[12px] font-semibold text-rf-on-surface-variant hover:text-rf-on-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules list */}
      {loading ? (
        <div className="rounded-2xl border border-rf-border-white-faint bg-rf-surface-container/50 p-8 text-center">
          <Icon name="progress_activity" className="mx-auto animate-spin text-[24px] text-rf-primary" />
          <p className="mt-2 text-[12px] text-rf-on-surface-variant">Loading routing rules…</p>
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-2xl border border-rf-border-white-faint bg-rf-surface-container/50 p-8 text-center">
          <Icon name="alt_route" className="mx-auto mb-3 text-[32px] text-rf-on-surface-variant/40" />
          <div className="text-[14px] font-semibold text-rf-on-surface">No routing rules yet</div>
          <p className="mt-1 text-[12px] text-rf-on-surface-variant">
            Add a rule above to automatically route submissions based on their content.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const at = ACTION_TYPES.find((a) => a.value === rule.action_type);
            return (
              <div key={rule.id} className="rounded-xl border border-rf-border-white-faint bg-rf-surface-container/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-rf-primary">{at?.icon ?? 'code'}</span>
                      <h3 className="truncate text-[14px] font-bold text-rf-on-surface">{rule.name}</h3>
                      {rule.is_active ? (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                          active
                        </span>
                      ) : (
                        <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rf-on-surface-variant">
                          inactive
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[12px] italic text-rf-on-surface-variant">"{rule.natural_language}"</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-rf-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <Icon name="bolt" className="text-[12px]" />
                        Fired {rule.fire_count}×
                      </span>
                      {rule.last_fired_at && (
                        <span className="flex items-center gap-1">
                          <Icon name="schedule" className="text-[12px]" />
                          Last: {new Date(rule.last_fired_at).toLocaleString()}
                        </span>
                      )}
                      <span className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-[10px]">
                        {rule.action_type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* How it works */}
      <details className="rounded-xl border border-rf-border-white-faint bg-rf-surface-container/30 p-4">
        <summary className="cursor-pointer list-none text-[12px] font-semibold text-rf-on-surface">
          <div className="flex items-center gap-2">
            <Icon name="hub" className="text-[14px] text-rf-primary" />
            How routing works
          </div>
        </summary>
        <p className="mt-3 text-[11px] leading-relaxed text-rf-on-surface-variant">
          When a new submission arrives, Reform loads all active routing rules for the form. For each rule, the LLM is asked: &quot;Does this submission satisfy the condition &apos;{`{rule}`}&apos;?&quot; If yes, the rule&apos;s action fires (email/webhook/Slack). Each evaluation is audit-logged in the Xano <code className="rounded bg-white/5 px-1.5 py-0.5">ai_generation_log</code> table with feature=&quot;smart_routing&quot;.
        </p>
      </details>
    </div>
  );
}
