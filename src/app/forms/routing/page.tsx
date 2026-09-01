'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { AppShell, Icon } from '@/components/app-shell';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionType = 'email' | 'webhook' | 'slack' | 'linear' | 'zendesk' | 'custom';

interface RoutingRule {
  id: string;
  name: string;
  natural_language: string;
  action_type: ActionType;
  action_config: Record<string, any>;
  is_active: boolean;
  fire_count: number;
  created_at: string;
  confidence?: number;
}

interface RuleTemplate {
  name: string;
  description: string;
  condition: string;
  action_type: ActionType;
  action_config: Record<string, any>;
  icon: string;
  color: string;
  category: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTION_TYPES: Array<{ value: ActionType; label: string; icon: string; placeholder: string; color: string }> = [
  { value: 'email', label: 'Email', icon: 'mail', placeholder: 'finance@company.com', color: 'text-amber-400' },
  { value: 'webhook', label: 'Webhook', icon: 'webhook', placeholder: 'https://api.example.com/hook', color: 'text-blue-400' },
  { value: 'slack', label: 'Slack', icon: 'tag', placeholder: 'https://hooks.slack.com/services/...', color: 'text-violet-400' },
  { value: 'linear', label: 'Linear', icon: 'linear_scale', placeholder: 'https://linear.app/team/...', color: 'text-cyan-400' },
  { value: 'zendesk', label: 'Zendesk', icon: 'support_agent', placeholder: 'https://your.zendesk.com/...', color: 'text-emerald-400' },
  { value: 'custom', label: 'Custom', icon: 'code', placeholder: 'https://your-endpoint.com', color: 'text-stone-400' },
];

const RULE_TEMPLATES: RuleTemplate[] = [
  {
    name: 'Billing complaints → Finance',
    description: 'Route submissions mentioning billing issues to the finance team',
    condition: 'If the feedback mentions billing, pricing, invoices, refunds, payments, or subscription issues, route to the finance team.',
    action_type: 'email',
    action_config: { to: 'finance@company.com', subject: '💰 Billing feedback received' },
    icon: 'payments',
    color: 'amber',
    category: 'Support',
  },
  {
    name: 'Urgent issues → Support lead',
    description: 'Escalate urgent or critical feedback to support leadership',
    condition: 'If the submission expresses urgency (words like "urgent", "critical", "broken", "down", "blocked", "emergency"), escalate immediately.',
    action_type: 'slack',
    action_config: { url: '' },
    icon: 'priority_high',
    color: 'red',
    category: 'Escalation',
  },
  {
    name: 'Feature requests → Product',
    description: 'Collect feature requests for the product roadmap',
    condition: 'If the feedback is a feature request, suggestion, or idea for improvement (mentions "feature", "wish", "suggest", "idea", "add", "could you"), route to product.',
    action_type: 'linear',
    action_config: { url: '' },
    icon: 'lightbulb',
    color: 'violet',
    category: 'Product',
  },
  {
    name: 'Bug reports → Engineering',
    description: 'Route technical issues and bug reports to engineering',
    condition: 'If the submission reports a bug, error, crash, or technical issue (mentions "bug", "error", "crash", "broken", "not working", "fix"), route to engineering.',
    action_type: 'linear',
    action_config: { url: '' },
    icon: 'bug_report',
    color: 'red',
    category: 'Engineering',
  },
  {
    name: 'Positive feedback → Team',
    description: 'Share positive feedback and testimonials with the team',
    condition: 'If the submission is positive, complimentary, or expresses satisfaction (mentions "love", "great", "amazing", "excellent", "happy", "thank"), share with the team.',
    action_type: 'slack',
    action_config: { url: '' },
    icon: 'favorite',
    color: 'pink',
    category: 'Culture',
  },
  {
    name: 'NPS 9-10 → Advocacy',
    description: 'Flag promoters for the customer advocacy program',
    condition: 'If the NPS rating is 9 or 10 (promoter), add to the customer advocacy list and send a thank-you email.',
    action_type: 'email',
    action_config: { to: 'advocacy@company.com', subject: '⭐ New promoter identified' },
    icon: 'emoji_events',
    color: 'amber',
    category: 'Growth',
  },
];

// ---------------------------------------------------------------------------
// Visual routing flow diagram
// ---------------------------------------------------------------------------

function RoutingFlowDiagram() {
  return (
    <div className="relative flex items-center justify-center gap-3 py-6">
      {/* Input */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
          <Icon name="inbox" className="text-[24px] text-emerald-400" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Submission</span>
      </div>

      {/* Arrow */}
      <div className="flex items-center gap-1">
        <div className="h-px w-8 bg-gradient-to-r from-emerald-500/50 to-violet-500/50" />
        <Icon name="chevron_right" className="text-[16px] text-violet-400" />
      </div>

      {/* AI Brain */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10">
          <Icon name="psychology" className="text-[28px] text-violet-400" />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[8px] font-bold text-white">
            AI
          </span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">Evaluator</span>
      </div>

      {/* Arrow */}
      <div className="flex items-center gap-1">
        <div className="h-px w-8 bg-gradient-to-r from-violet-500/50 to-amber-500/50" />
        <Icon name="chevron_right" className="text-[16px] text-amber-400" />
      </div>

      {/* Rules */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
          <Icon name="alt_route" className="text-[24px] text-amber-400" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Rules</span>
      </div>

      {/* Arrow */}
      <div className="flex items-center gap-1">
        <div className="h-px w-8 bg-gradient-to-r from-amber-500/50 to-blue-500/50" />
        <Icon name="chevron_right" className="text-[16px] text-blue-400" />
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10">
          <Icon name="bolt" className="text-[24px] text-blue-400" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">Actions</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rule template card
// ---------------------------------------------------------------------------

function TemplateCard({
  template,
  onSelect,
}: {
  template: RuleTemplate;
  onSelect: (template: RuleTemplate) => void;
}) {
  const colorMap: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
    amber: { bg: 'bg-amber-500/5', border: 'border-amber-500/15', text: 'text-amber-400', iconBg: 'bg-amber-500/10' },
    red: { bg: 'bg-red-500/5', border: 'border-red-500/15', text: 'text-red-400', iconBg: 'bg-red-500/10' },
    violet: { bg: 'bg-violet-500/5', border: 'border-violet-500/15', text: 'text-violet-400', iconBg: 'bg-violet-500/10' },
    blue: { bg: 'bg-blue-500/5', border: 'border-blue-500/15', text: 'text-blue-400', iconBg: 'bg-blue-500/10' },
    pink: { bg: 'bg-pink-500/5', border: 'border-pink-500/15', text: 'text-pink-400', iconBg: 'bg-pink-500/10' },
    emerald: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/15', text: 'text-emerald-400', iconBg: 'bg-emerald-500/10' },
  };
  const c = colorMap[template.color] || colorMap.amber;

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className={`group flex w-full items-start gap-4 rounded-2xl border ${c.border} ${c.bg} p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg`}
    >
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${c.iconBg}`}>
        <Icon name={template.icon} className={`text-[20px] ${c.text}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[13px] font-bold text-rf-on-surface">{template.name}</h3>
          <span className={`flex-shrink-0 rounded-full ${c.iconBg} ${c.text} px-1.5 py-px text-[8px] font-bold uppercase`}>
            {template.category}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-rf-on-surface-variant">{template.description}</p>
        <p className="mt-1.5 truncate text-[11px] italic text-rf-on-surface-variant/70">
          "{template.condition}"
        </p>
      </div>
      <Icon name="add_circle" className={`mt-1 flex-shrink-0 text-[18px] opacity-0 transition-opacity group-hover:opacity-100 ${c.text}`} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Rule card
// ---------------------------------------------------------------------------

function RuleCard({ rule, onToggle }: { rule: RoutingRule; onToggle: (id: string) => void }) {
  const actionMeta = ACTION_TYPES.find((a) => a.value === rule.action_type) ?? ACTION_TYPES[0];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/8 bg-rf-surface-container/60 p-5 transition-all duration-200 hover:border-white/12 hover:bg-rf-surface-container">
      {/* Glow on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/0 via-violet-500/0 to-amber-500/0 transition-all group-hover:from-violet-500/[0.02] group-hover:to-amber-500/[0.02]" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${rule.is_active ? 'bg-emerald-500/10' : 'bg-stone-500/10'}`}>
              <Icon name={actionMeta.icon} className={`text-[18px] ${rule.is_active ? actionMeta.color : 'text-stone-500'}`} />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-rf-on-surface">{rule.name}</h3>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-rf-on-surface-variant">
                <span className={`rounded-full px-1.5 py-px text-[9px] font-bold uppercase ${
                  rule.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-stone-500/10 text-stone-500'
                }`}>
                  {rule.is_active ? 'Active' : 'Paused'}
                </span>
                <span className="text-rf-on-surface-variant/50">•</span>
                <span>{actionMeta.label}</span>
              </div>
            </div>
          </div>

          {/* Toggle */}
          <button
            type="button"
            onClick={() => onToggle(rule.id)}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ${
              rule.is_active ? 'bg-emerald-500' : 'bg-stone-600'
            }`}
            aria-label={rule.is_active ? 'Pause rule' : 'Activate rule'}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                rule.is_active ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Condition */}
        <div className="mt-3 rounded-xl border border-white/5 bg-rf-input-hollow-bg p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-violet-400/60">
            <Icon name="psychology" className="text-[12px]" />
            AI evaluates
          </div>
          <p className="mt-1 text-[12px] italic text-rf-on-surface-variant">
            "{rule.natural_language}"
          </p>
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center gap-4 text-[11px] text-rf-on-surface-variant">
          <span className="flex items-center gap-1">
            <Icon name="bolt" className="text-[12px] text-amber-400" />
            <span className="font-semibold text-rf-on-surface">{rule.fire_count}</span> fired
          </span>
          <span className="flex items-center gap-1">
            <Icon name="schedule" className="text-[12px]" />
            Created {new Date(rule.created_at).toLocaleDateString()}
          </span>
          {rule.confidence && (
            <span className="flex items-center gap-1">
              <Icon name="verified" className="text-[12px] text-emerald-400" />
              {Math.round(rule.confidence * 100)}% confidence
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evaluation preview
// ---------------------------------------------------------------------------

function EvaluationPreview() {
  const [sampleText, setSampleText] = useState('The product is amazing but I was overcharged on my last invoice. Please fix this billing issue ASAP.');
  const [evaluating, setEvaluating] = useState(false);
  const [results, setResults] = useState<Array<{ rule: string; matches: boolean; confidence: number; reason: string }>>([]);

  const handleEvaluate = useCallback(() => {
    setEvaluating(true);
    // Simulate AI evaluation (in production, this calls the real LLM)
    setTimeout(() => {
      setResults([
        { rule: 'Billing complaints → Finance', matches: true, confidence: 0.92, reason: 'Submission mentions "overcharged" and "billing issue"' },
        { rule: 'Urgent issues → Support lead', matches: true, confidence: 0.78, reason: 'Submission contains "ASAP" indicating urgency' },
        { rule: 'Positive feedback → Team', matches: true, confidence: 0.85, reason: 'Submission starts with positive feedback ("amazing")' },
        { rule: 'Feature requests → Product', matches: false, confidence: 0.15, reason: 'No feature request language detected' },
      ]);
      setEvaluating(false);
    }, 1500);
  }, []);

  return (
    <div className="rounded-2xl border border-white/8 bg-rf-surface-container/60 p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
          <Icon name="science" className="text-[16px] text-violet-400" />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-rf-on-surface">Evaluation Playground</h3>
          <p className="text-[11px] text-rf-on-surface-variant">Test how your rules respond to sample submissions</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant/60">
            Sample submission data
          </label>
          <textarea
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            rows={3}
            className="w-full resize-y rounded-xl border border-white/8 bg-rf-input-hollow-bg px-4 py-3 text-[12px] text-rf-on-surface placeholder:text-rf-on-surface-variant/30 focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
            placeholder="Paste or type a sample form submission..."
          />
        </div>

        <button
          type="button"
          onClick={handleEvaluate}
          disabled={evaluating || !sampleText.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500/10 px-4 py-2.5 text-[12px] font-bold text-violet-400 transition-all hover:bg-violet-500/20 disabled:opacity-40"
        >
          {evaluating ? (
            <>
              <Icon name="progress_activity" className="animate-spin text-[16px]" />
              Evaluating with AI...
            </>
          ) : (
            <>
              <Icon name="play_arrow" className="text-[16px]" />
              Run Evaluation
            </>
          )}
        </button>

        {results.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant/60">
              Results
            </div>
            {results.map((r, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-xl border p-3 ${
                  r.matches
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : 'border-white/5 bg-rf-input-hollow-bg'
                }`}
              >
                <Icon
                  name={r.matches ? 'check_circle' : 'cancel'}
                  className={`mt-0.5 flex-shrink-0 text-[14px] ${
                    r.matches ? 'text-emerald-400' : 'text-stone-500'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-rf-on-surface">{r.rule}</span>
                    {r.matches && (
                      <span className="rounded-full bg-emerald-500/10 px-1.5 py-px text-[8px] font-bold text-emerald-400">
                        {Math.round(r.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-rf-on-surface-variant">{r.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function RoutingPage() {
  const [rules, setRules] = useState<RoutingRule[]>([
    {
      id: '1',
      name: 'Billing complaints → Finance',
      natural_language: 'If the feedback mentions billing, pricing, invoices, or refunds, route to the finance team.',
      action_type: 'email',
      action_config: { to: 'finance@company.com', subject: '💰 Billing feedback' },
      is_active: true,
      fire_count: 23,
      created_at: '2026-08-15T10:00:00Z',
    },
    {
      id: '2',
      name: 'Urgent issues → Support lead',
      natural_language: 'If the submission expresses urgency (words like "urgent", "critical", "broken", "down"), escalate immediately.',
      action_type: 'slack',
      action_config: { url: 'https://hooks.slack.com/services/...' },
      is_active: true,
      fire_count: 8,
      created_at: '2026-08-18T14:30:00Z',
    },
    {
      id: '3',
      name: 'Feature requests → Product',
      natural_language: 'If the feedback is a feature request or suggestion (mentions "feature", "wish", "suggest", "idea"), route to product.',
      action_type: 'linear',
      action_config: { url: 'https://linear.app/team/...' },
      is_active: false,
      fire_count: 4,
      created_at: '2026-08-20T09:15:00Z',
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'templates' | 'playground'>('rules');

  // Form state
  const [name, setName] = useState('');
  const [condition, setCondition] = useState('');
  const [actionType, setActionType] = useState<ActionType>('email');
  const [actionTarget, setActionTarget] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateRule = useCallback(async () => {
    if (!name.trim() || !condition.trim() || !actionTarget.trim()) return;
    setCreating(true);

    // Simulate creation (in production, this calls the API)
    await new Promise((r) => setTimeout(r, 800));

    const newRule: RoutingRule = {
      id: Date.now().toString(),
      name: name.trim(),
      natural_language: condition.trim(),
      action_type: actionType,
      action_config: actionType === 'email' ? { to: actionTarget, subject: `Route: ${name}` } : { url: actionTarget },
      is_active: true,
      fire_count: 0,
      created_at: new Date().toISOString(),
    };

    setRules((prev) => [newRule, ...prev]);
    setName('');
    setCondition('');
    setActionTarget('');
    setShowForm(false);
    setCreating(false);
  }, [name, condition, actionType, actionTarget]);

  const handleSelectTemplate = useCallback((template: RuleTemplate) => {
    setName(template.name);
    setCondition(template.condition);
    setActionType(template.action_type);
    setActionTarget(template.action_config.to || template.action_config.url || '');
    setShowForm(true);
    setActiveTab('rules');
  }, []);

  const handleToggleRule = useCallback((id: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, is_active: !r.is_active } : r)));
  }, []);

  return (
    <AppShell activePath="/forms/new?mode=routing" brandSubtitle="AI routing">
      <div className="min-h-screen bg-rf-surface-base text-rf-on-surface">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
          {/* Breadcrumb */}
          <div className="mb-6 flex flex-wrap items-center gap-2 text-[12px] text-rf-on-surface-variant">
            <Link href="/dashboard" className="transition-colors hover:text-rf-primary">
              Dashboard
            </Link>
            <Icon name="chevron_right" className="text-[14px]" />
            <span className="font-semibold text-rf-on-surface">Smart Routing</span>
          </div>

          {/* Hero */}
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <Icon name="alt_route" className="text-[22px] text-emerald-400" />
              </div>
              <div>
                <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">
                  Smart Routing
                </h1>
              </div>
            </div>
            <p className="mt-2 max-w-2xl text-[15px] text-rf-on-surface-variant">
              Write routing rules in plain English. Reform's AI evaluates each new submission against your rules and fires the matching action automatically.
            </p>
          </header>

          {/* Flow diagram */}
          <div className="mb-8 rounded-2xl border border-white/8 bg-rf-surface-container/40 px-6">
            <RoutingFlowDiagram />
          </div>

          {/* Tab navigation */}
          <div className="mb-6 flex items-center gap-1 rounded-xl border border-white/8 bg-rf-surface-container/40 p-1">
            {[
              { id: 'rules' as const, label: 'Active Rules', icon: 'alt_route', count: rules.length },
              { id: 'templates' as const, label: 'Templates', icon: 'auto_awesome', count: RULE_TEMPLATES.length },
              { id: 'playground' as const, label: 'Test Playground', icon: 'science' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-rf-primary/10 text-rf-primary'
                    : 'text-rf-on-surface-variant hover:text-rf-on-surface'
                }`}
              >
                <Icon name={tab.icon} className="text-[14px]" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`rounded-full px-1.5 py-px text-[9px] font-bold ${
                    activeTab === tab.id ? 'bg-rf-primary/20 text-rf-primary' : 'bg-white/5 text-rf-on-surface-variant'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              {/* Create button */}
              <div className="flex items-center justify-between">
                <div className="text-[12px] text-rf-on-surface-variant">
                  <span className="font-semibold text-rf-on-surface">{rules.filter((r) => r.is_active).length}</span> active rules
                </div>
                <button
                  type="button"
                  onClick={() => setShowForm((v) => !v)}
                  className="flex items-center gap-2 rounded-xl bg-rf-primary/10 px-4 py-2.5 text-[12px] font-bold text-rf-primary transition-all hover:bg-rf-primary/15"
                >
                  <Icon name={showForm ? 'close' : 'add'} className="text-[16px]" />
                  {showForm ? 'Cancel' : 'New Rule'}
                </button>
              </div>

              {/* Create form */}
              {showForm && (
                <div className="rounded-2xl border border-rf-primary/20 bg-rf-primary/5 p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon name="add_circle" className="text-[18px] text-rf-primary" />
                    <span className="text-[13px] font-bold text-rf-on-surface">Create routing rule</span>
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant/60">
                      Rule name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Billing complaints → Finance team"
                      className="w-full rounded-xl border border-white/8 bg-rf-input-hollow-bg px-4 py-2.5 text-[12px] text-rf-on-surface placeholder:text-rf-on-surface-variant/30 focus:border-rf-primary/40 focus:outline-none focus:ring-1 focus:ring-rf-primary/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant/60">
                      Condition (natural language)
                    </label>
                    <textarea
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      rows={3}
                      placeholder='e.g. If the feedback mentions billing, pricing, or refunds, route to the finance team.'
                      className="w-full resize-y rounded-xl border border-white/8 bg-rf-input-hollow-bg px-4 py-2.5 text-[12px] text-rf-on-surface placeholder:text-rf-on-surface-variant/30 focus:border-rf-primary/40 focus:outline-none focus:ring-1 focus:ring-rf-primary/20"
                    />
                    <p className="mt-1 text-[10px] text-rf-on-surface-variant/40">
                      The AI will evaluate this condition against every new submission using natural language understanding.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant/60">
                        Action type
                      </label>
                      <select
                        value={actionType}
                        onChange={(e) => setActionType(e.target.value as ActionType)}
                        className="w-full rounded-xl border border-white/8 bg-rf-input-hollow-bg px-4 py-2.5 text-[12px] text-rf-on-surface focus:border-rf-primary/40 focus:outline-none"
                      >
                        {ACTION_TYPES.map((at) => (
                          <option key={at.value} value={at.value}>{at.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant/60">
                        {actionType === 'email' ? 'Recipient email' : 'Target URL'}
                      </label>
                      <input
                        type="text"
                        value={actionTarget}
                        onChange={(e) => setActionTarget(e.target.value)}
                        placeholder={ACTION_TYPES.find((a) => a.value === actionType)?.placeholder}
                        className="w-full rounded-xl border border-white/8 bg-rf-input-hollow-bg px-4 py-2.5 text-[12px] text-rf-on-surface placeholder:text-rf-on-surface-variant/30 focus:border-rf-primary/40 focus:outline-none focus:ring-1 focus:ring-rf-primary/20"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCreateRule}
                      disabled={!name.trim() || !condition.trim() || !actionTarget.trim() || creating}
                      className="flex items-center gap-2 rounded-xl bg-rf-primary px-5 py-2.5 text-[12px] font-bold text-white transition-all hover:bg-rf-primary/90 disabled:opacity-40"
                    >
                      {creating ? (
                        <>
                          <Icon name="progress_activity" className="animate-spin text-[14px]" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Icon name="add" className="text-[14px]" />
                          Create Rule
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="rounded-xl border border-white/8 px-4 py-2.5 text-[12px] font-semibold text-rf-on-surface-variant hover:text-rf-on-surface"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Rules list */}
              {rules.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-rf-surface-container/40 p-12 text-center">
                  <Icon name="alt_route" className="mx-auto mb-3 text-[40px] text-rf-on-surface-variant/20" />
                  <h3 className="text-[16px] font-bold text-rf-on-surface">No routing rules yet</h3>
                  <p className="mt-1 text-[13px] text-rf-on-surface-variant">
                    Create your first rule or pick a template to get started.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(true)}
                      className="flex items-center gap-2 rounded-xl bg-rf-primary/10 px-4 py-2 text-[12px] font-bold text-rf-primary hover:bg-rf-primary/15"
                    >
                      <Icon name="add" className="text-[14px]" />
                      Create Rule
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('templates')}
                      className="flex items-center gap-2 rounded-xl border border-white/8 px-4 py-2 text-[12px] font-semibold text-rf-on-surface-variant hover:text-rf-on-surface"
                    >
                      <Icon name="auto_awesome" className="text-[14px]" />
                      Browse Templates
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <RuleCard key={rule.id} rule={rule} onToggle={handleToggleRule} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="text-[12px] text-rf-on-surface-variant">
                Click a template to create a pre-configured routing rule.
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {RULE_TEMPLATES.map((template) => (
                  <TemplateCard key={template.name} template={template} onSelect={handleSelectTemplate} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'playground' && <EvaluationPreview />}

          {/* How it works */}
          <div className="mt-10 rounded-2xl border border-white/8 bg-rf-surface-container/40 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="info" className="text-[16px] text-rf-primary" />
              <h3 className="text-[13px] font-bold text-rf-on-surface">How Smart Routing works</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  step: '1',
                  icon: 'edit_note',
                  title: 'Write a rule',
                  desc: 'Describe your routing condition in plain English. No code, no regex, no syntax.',
                },
                {
                  step: '2',
                  icon: 'psychology',
                  title: 'AI evaluates',
                  desc: 'When a submission arrives, the AI reads your rule and decides if it matches the data.',
                },
                {
                  step: '3',
                  icon: 'bolt',
                  title: 'Action fires',
                  desc: 'If matched, the configured action executes instantly — email, webhook, Slack, or custom.',
                },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3 rounded-xl border border-white/5 bg-rf-input-hollow-bg p-4">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-rf-primary/10 text-[11px] font-bold text-rf-primary">
                    {item.step}
                  </div>
                  <div>
                    <Icon name={item.icon} className="mb-1 text-[16px] text-rf-primary" />
                    <h4 className="text-[12px] font-bold text-rf-on-surface">{item.title}</h4>
                    <p className="text-[11px] text-rf-on-surface-variant">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
