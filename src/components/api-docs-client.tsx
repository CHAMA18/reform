'use client';

import { useState } from 'react';
import { Icon } from '@/components/app-shell';

/**
 * ApiDocsClient
 *
 * Interactive API documentation with copyable code examples for each endpoint.
 * Includes a "Try it" panel where users can paste their API key and test
 * requests live.
 */

interface Endpoint {
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH';
  path: string;
  title: string;
  description: string;
  scope: string;
  params?: Array<{ name: string; type: string; description: string; required?: boolean }>;
  bodyExample?: string;
  responseExample: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: 'POST',
    path: '/api/api-keys',
    title: 'Create API Key',
    description: 'Generate a new API key. The full key is returned only once.',
    scope: '— (management, no auth required)',
    bodyExample: `{
  "name": "Production Webhook",
  "permissions": ["forms:read", "submissions:read"]
}`,
    responseExample: `{
  "id": "clk...",
  "key": "fep_live_a1b2c3d4...",
  "keyPrefix": "fep_live_a1b2",
  "name": "Production Webhook",
  "permissions": ["forms:read", "submissions:read"],
  "status": "active",
  "createdAt": "2026-06-27T..."
}`,
  },
  {
    method: 'GET',
    path: '/api/api-keys',
    title: 'List API Keys',
    description: 'List all API keys (metadata only — full keys are never returned).',
    scope: '— (management, no auth required)',
    responseExample: `{
  "keys": [
    {
      "id": "clk...",
      "name": "Production Webhook",
      "keyPrefix": "fep_live_a1b2",
      "status": "active",
      "permissions": ["forms:read", "submissions:read"],
      "lastUsedAt": "2026-06-27T...",
      "createdAt": "2026-06-20T..."
    }
  ]
}`,
  },
  {
    method: 'POST',
    path: '/api/api-keys/{id}/rotate',
    title: 'Rotate API Key',
    description: 'Generate a new key string for an existing key. The old key immediately stops working. The key id, name, and permissions stay the same.',
    scope: '— (management, no auth required)',
    responseExample: `{
  "id": "clk...",
  "key": "fep_live_x9y8z7w6...",
  "keyPrefix": "fep_live_x9y8",
  "rotatedAt": "2026-06-27T..."
}`,
  },
  {
    method: 'DELETE',
    path: '/api/api-keys/{id}',
    title: 'Revoke API Key',
    description: 'Soft-delete an API key. It immediately stops working.',
    scope: '— (management, no auth required)',
    responseExample: `{
  "id": "clk...",
  "status": "revoked"
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/forms',
    title: 'List Forms',
    description: 'List all published forms with submission counts.',
    scope: 'forms:read',
    responseExample: `{
  "forms": [
    {
      "id": "clk...",
      "shareId": "cmqv...",
      "name": "Customer Feedback Survey",
      "description": "...",
      "status": "published",
      "submissionCount": 42,
      "createdAt": "2026-06-20T..."
    }
  ]
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/forms',
    title: 'Create Form',
    description: 'Create and publish a new form from a flowchart definition.',
    scope: 'forms:write',
    bodyExample: `{
  "name": "Newsletter Signup",
  "description": "Collect email signups",
  "flowchart": {
    "nodes": [
      { "id": "n1", "type": "start", "position": {"x":80,"y":240}, "data": {"label":"Start"} },
      { "id": "n2", "type": "field", "position": {"x":360,"y":220}, "data": {"label":"Email","fieldType":"email","required":true} },
      { "id": "n3", "type": "submit", "position": {"x":680,"y":240}, "data": {"label":"Submit"} }
    ],
    "edges": [
      { "id": "e1", "source": "n1", "target": "n2" },
      { "id": "e2", "source": "n2", "target": "n3" }
    ]
  }
}`,
    responseExample: `{
  "id": "clk...",
  "shareId": "cmqv...",
  "name": "Newsletter Signup",
  "status": "published",
  "createdAt": "2026-06-27T..."
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/forms/{shareId}',
    title: 'Get Form',
    description: 'Get a single form\'s full schema definition.',
    scope: 'forms:read',
    responseExample: `{
  "id": "clk...",
  "shareId": "cmqv...",
  "name": "Customer Feedback Survey",
  "status": "published",
  "schema": {
    "schema_name": "Customer Feedback Survey",
    "version": "1.0.0",
    "fields": [...],
    "logic": [...]
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/forms/{shareId}/submissions',
    title: 'List Submissions',
    description: 'List submissions for a form. Supports pagination.',
    scope: 'submissions:read',
    params: [
      { name: 'limit', type: 'number', description: 'Max results (default 50, max 200)' },
      { name: 'offset', type: 'number', description: 'Pagination offset (default 0)' },
    ],
    responseExample: `{
  "form": { "id": "clk...", "name": "Customer Feedback Survey" },
  "submissions": [
    {
      "id": "2026-06-27T...",
      "data": { "field_id": "Alex Sterling" },
      "source": "127.0.0.1",
      "status": "Live",
      "timestamp": "2026-06-27T..."
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/forms/{shareId}/submissions',
    title: 'Submit Form Response',
    description: 'Submit a form response via the API. Validates required fields and respects conditional visibility.',
    scope: 'submissions:write',
    bodyExample: `{
  "data": {
    "node_abc123": "alex@example.com",
    "node_def456": "Great service!"
  }
}`,
    responseExample: `{
  "id": "2026-06-27T...",
  "status": "Live",
  "formId": "clk...",
  "formName": "Customer Feedback Survey"
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/submissions',
    title: 'List All Submissions',
    description: 'List submissions across all forms. Supports filtering by formId and pagination.',
    scope: 'submissions:read',
    params: [
      { name: 'limit', type: 'number', description: 'Max results (default 50, max 200)' },
      { name: 'offset', type: 'number', description: 'Pagination offset (default 0)' },
      { name: 'formId', type: 'string', description: 'Filter by form ID' },
    ],
    responseExample: `{
  "submissions": [...],
  "total": 1284,
  "limit": 50,
  "offset": 0
}`,
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  POST: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
  PATCH: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export function ApiDocsClient() {
  const [expanded, setExpanded] = useState<string | null>(ENDPOINTS[4].path);
  const [apiKey, setApiKey] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setTestResult('Error: Enter your API key first');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/v1/forms', {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });
      const body = await res.json();
      setTestResult(`HTTP ${res.status}\n\n${JSON.stringify(body, null, 2)}`);
    } catch (e) {
      setTestResult(`Error: ${e instanceof Error ? e.message : 'Request failed'}`);
    } finally {
      setTesting(false);
    }
  };

  const copyCode = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Authentication section */}
      <section className="glass-panel rounded-2xl border border-white/10 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-rf-on-surface">
          <Icon name="lock" className="text-[18px] text-rf-primary" />
          Authentication
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-rf-on-surface-variant">
          All API requests must include an API key. You can pass it via the{' '}
          <code className="rounded bg-rf-input-hollow-bg px-1.5 py-0.5 font-mono text-[11px] text-rf-primary">
            Authorization: Bearer
          </code>{' '}
          header or the{' '}
          <code className="rounded bg-rf-input-hollow-bg px-1.5 py-0.5 font-mono text-[11px] text-rf-primary">
            x-api-key
          </code>{' '}
          header. Create a key on the{' '}
          <a href="/api-keys" className="text-rf-primary underline hover:no-underline">
            API Keys page
          </a>
          .
        </p>
        <div className="mt-3 rounded-lg border border-white/10 bg-rf-surface-base p-3">
          <code className="font-mono text-[11px] text-rf-on-surface">
            <span className="text-rf-on-surface-variant"># Bearer token (recommended)</span>
            {'\n'}
            <span className="text-emerald-400">curl</span> https://reform.onrender.com/api/v1/forms{' \\\n  '}
            <span className="text-rf-primary">-H</span> <span className="text-amber-300">&quot;Authorization: Bearer fep_live_...&quot;</span>
            {'\n\n'}
            <span className="text-rf-on-surface-variant"># x-api-key header</span>
            {'\n'}
            <span className="text-emerald-400">curl</span> https://reform.onrender.com/api/v1/forms{' \\\n  '}
            <span className="text-rf-primary">-H</span> <span className="text-amber-300">&quot;x-api-key: fep_live_...&quot;</span>
          </code>
        </div>
      </section>

      {/* Try it panel */}
      <section className="glass-panel rounded-2xl border border-rf-primary/20 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-rf-on-surface">
          <Icon name="science" className="text-[18px] text-rf-primary" />
          Try It Live
        </h2>
        <p className="mt-2 text-[13px] text-rf-on-surface-variant">
          Enter your API key to test the <code className="font-mono text-[11px] text-rf-primary">GET /api/v1/forms</code> endpoint.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="fep_live_..."
            className="flex-1 rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2.5 font-mono text-[12px] text-rf-on-surface placeholder:text-rf-on-surface-variant/40 focus:border-rf-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-bold disabled:opacity-50"
          >
            <Icon name={testing ? 'progress_activity' : 'play_arrow'} className="text-[16px]" />
            {testing ? 'Testing…' : 'Send'}
          </button>
        </div>
        {testResult && (
          <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-white/10 bg-rf-surface-base p-3 font-mono text-[11px] text-rf-on-surface">
            <code>{testResult}</code>
          </pre>
        )}
      </section>

      {/* Endpoints */}
      <section className="space-y-3">
        <h2 className="text-[16px] font-bold text-rf-on-surface">Endpoints</h2>
        {ENDPOINTS.map((ep) => {
          const isExpanded = expanded === ep.path;
          return (
            <div
              key={`${ep.method}-${ep.path}`}
              className="glass-panel overflow-hidden rounded-xl border border-white/10"
            >
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : ep.path)}
                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-white/[0.02]"
              >
                <span
                  className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold ${METHOD_COLORS[ep.method]}`}
                >
                  {ep.method}
                </span>
                <code className="flex-1 font-mono text-[13px] text-rf-on-surface">
                  {ep.path}
                </code>
                <Icon
                  name={isExpanded ? 'expand_less' : 'expand_more'}
                  className="text-[18px] text-rf-on-surface-variant"
                />
              </button>
              {isExpanded && (
                <div className="space-y-4 border-t border-white/10 p-4">
                  <div>
                    <h3 className="text-[14px] font-bold text-rf-on-surface">
                      {ep.title}
                    </h3>
                    <p className="mt-1 text-[12px] text-rf-on-surface-variant">
                      {ep.description}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[11px]">
                      <span className="text-rf-on-surface-variant">Required scope:</span>
                      <code className="rounded bg-rf-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rf-primary">
                        {ep.scope}
                      </code>
                    </div>
                  </div>

                  {ep.params && ep.params.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                        Query Parameters
                      </div>
                      <div className="mt-2 space-y-1">
                        {ep.params.map((p) => (
                          <div key={p.name} className="flex gap-3 text-[12px]">
                            <code className="font-mono text-rf-primary">{p.name}</code>
                            <span className="text-rf-on-surface-variant/60">{p.type}</span>
                            <span className="flex-1 text-rf-on-surface-variant">{p.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {ep.bodyExample && (
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                          Request Body
                        </div>
                        <button
                          type="button"
                          onClick={() => copyCode(ep.bodyExample!)}
                          className="rounded p-1 text-rf-on-surface-variant hover:text-rf-on-surface"
                        >
                          <Icon name="content_copy" className="text-[14px]" />
                        </button>
                      </div>
                      <pre className="mt-1 overflow-x-auto rounded-lg border border-white/10 bg-rf-surface-base p-3 font-mono text-[11px] text-rf-on-surface">
                        <code>{ep.bodyExample}</code>
                      </pre>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                        Response
                      </div>
                      <button
                        type="button"
                        onClick={() => copyCode(ep.responseExample)}
                        className="rounded p-1 text-rf-on-surface-variant hover:text-rf-on-surface"
                      >
                        <Icon name="content_copy" className="text-[14px]" />
                      </button>
                    </div>
                    <pre className="mt-1 overflow-x-auto rounded-lg border border-white/10 bg-rf-surface-base p-3 font-mono text-[11px] text-rf-on-surface">
                      <code>{ep.responseExample}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Code examples */}
      <section className="glass-panel rounded-2xl border border-white/10 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-rf-on-surface">
          <Icon name="code" className="text-[18px] text-rf-primary" />
          Code Examples
        </h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
              JavaScript / Node.js
            </div>
            <pre className="overflow-x-auto rounded-lg border border-white/10 bg-rf-surface-base p-3 font-mono text-[11px] text-rf-on-surface">
              <code>{`const res = await fetch(
  'https://reform.onrender.com/api/v1/forms',
  {
    headers: {
      'Authorization':
        'Bearer fep_live_...'
    }
  }
);
const { forms } = await res.json();
console.log(forms);`}</code>
            </pre>
          </div>
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
              Python
            </div>
            <pre className="overflow-x-auto rounded-lg border border-white/10 bg-rf-surface-base p-3 font-mono text-[11px] text-rf-on-surface">
              <code>{`import requests

res = requests.get(
  'https://reform.onrender.com/api/v1/forms',
  headers={
    'Authorization':
      'Bearer fep_live_...'
  }
)
forms = res.json()['forms']
print(forms)`}</code>
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
