'use client';

import { useState } from 'react';

export function SetupDatabaseClient() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSetup = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/setup-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword: 'StackOne2024',
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data.message + '\n\nNew connection string:\n' + data.newConnectionString);
      } else {
        setError(data.error || 'Setup failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--rf-surface-base)' }}>
      <div className="w-full max-w-lg rounded-2xl border p-8" style={{ borderColor: 'var(--rf-border-white-faint)', background: 'var(--rf-surface-container)' }}>
        <h1 className="text-[24px] font-bold mb-2" style={{ color: 'var(--rf-on-surface)' }}>
          Database Setup
        </h1>
        <p className="text-[14px] mb-6" style={{ color: 'var(--rf-on-surface-variant)' }}>
          Enter the database password from the Render dashboard. This will set the password to <code className="px-1 py-0.5 rounded font-mono text-[12px]" style={{ background: 'var(--rf-input-hollow-bg)', color: '#f59e0b' }}>StackOne2024</code> permanently.
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--rf-on-surface-variant)' }}>
              Render Database Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Paste the password from Render dashboard"
              className="w-full rounded-lg border px-4 py-3 text-[14px]"
              style={{
                borderColor: 'var(--rf-border-white-faint)',
                background: 'var(--rf-input-hollow-bg)',
                color: 'var(--rf-on-surface)',
              }}
            />
          </div>

          <div className="rounded-lg border p-3 text-[12px]" style={{ borderColor: 'var(--rf-border-white-faint)', background: 'var(--rf-input-hollow-bg)' }}>
            <p style={{ color: 'var(--rf-on-surface-variant)' }}>
              <strong>How to get the password:</strong>
              <br />
              1. Go to <a href="https://dashboard.render.com/d/dpg-d8vvuersq97s738sb2rg-a" target="_blank" rel="noopener" className="underline" style={{ color: '#f59e0b' }}>Render Database Dashboard</a>
              <br />
              2. Scroll to "Connections" section
              <br />
              3. Copy the password from the Internal Database URL
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[13px] text-red-300">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-[13px] text-emerald-300 whitespace-pre-wrap">
              {result}
            </div>
          )}

          <button
            onClick={handleSetup}
            disabled={loading || !currentPassword}
            className="w-full rounded-lg py-3 text-[14px] font-bold transition-all disabled:opacity-50"
            style={{ background: '#f59e0b', color: '#fff' }}
          >
            {loading ? 'Setting up...' : 'Set Password to StackOne2024'}
          </button>
        </div>
      </div>
    </div>
  );
}
