'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/app-shell';
import { PERMISSION_SCOPES, maskPrefix, type PermissionScope } from '@/lib/api-key-crypto';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  status: string;
  permissions: string[];
  lastRotatedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

interface CreatedKey {
  id: string;
  key: string;
  keyPrefix: string;
  name: string;
  permissions: string[];
}

/**
 * ApiKeysManager
 *
 * Client component that manages the full lifecycle of API keys:
 *   - Create (with name + permission scopes)
 *   - List (shows prefix only — full key is never retrievable after creation)
 *   - Rotate (generates a new key, invalidates the old one)
 *   - Revoke (soft-deletes — key immediately stops working)
 *   - Copy (one-time full key copy at creation/rotation)
 */
export function ApiKeysManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [rotatedKey, setRotatedKey] = useState<{ id: string; key: string; name: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newPerms, setNewPerms] = useState<string[]>([
    'forms:read',
    'forms:write',
    'submissions:read',
    'submissions:write',
  ]);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/api-keys');
      if (!res.ok) throw new Error('Failed to load keys');
      const data = await res.json();
      setKeys(data.keys);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      setError('Key name is required');
      return;
    }
    setError(null);
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, permissions: newPerms }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to create key');
      }
      const data = await res.json();
      setCreatedKey(data);
      setShowCreate(false);
      setNewName('');
      await loadKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create key');
    }
  };

  const handleRotate = async (id: string, name: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/api-keys/${id}/rotate`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to rotate key');
      }
      const data = await res.json();
      setRotatedKey({ id, key: data.key, name });
      await loadKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to rotate key');
    }
  };

  const handleRevoke = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to revoke key');
      }
      setConfirmRevoke(null);
      await loadKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke key');
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  };

  const togglePerm = (scope: string) => {
    setNewPerms((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const formatDate = (iso: string | null): string => {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const activeCount = keys.filter((k) => k.status === 'active').length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[12px] text-red-300">
          <span className="material-symbols-outlined mt-0.5 text-[16px] text-red-400">
            error
          </span>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="glass-panel rounded-xl p-4">
          <div className="flex items-center gap-2 text-rf-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-rf-primary">vpn_key</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider">Total Keys</span>
          </div>
          <div className="mt-1 text-[28px] font-bold text-rf-on-surface">{keys.length}</div>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <div className="flex items-center gap-2 text-rf-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider">Active</span>
          </div>
          <div className="mt-1 text-[28px] font-bold text-emerald-400">{activeCount}</div>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <div className="flex items-center gap-2 text-rf-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-amber-400">block</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider">Revoked</span>
          </div>
          <div className="mt-1 text-[28px] font-bold text-amber-400">{keys.length - activeCount}</div>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <div className="flex items-center gap-2 text-rf-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-rf-primary">schedule</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider">Last Used</span>
          </div>
          <div className="mt-1 truncate text-[12px] font-medium text-rf-on-surface">
            {keys.length > 0
              ? formatDate(keys.reduce((latest, k) =>
                  k.lastUsedAt && (!latest || k.lastUsedAt > latest) ? k.lastUsedAt : latest, null as string | null))
              : 'Never'}
          </div>
        </div>
      </div>

      {/* Create button + header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-rf-on-surface">
            Access Credentials
          </h3>
          <p className="mt-0.5 text-[12px] text-rf-on-surface-variant">
            Manage API keys for programmatic access. Keys are shown once — store them securely.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          data-tour="apikeys-create"
          className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-bold"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Create Key
        </button>
      </div>

      {/* Keys table */}
      <div data-tour="apikeys-table" className="glass-panel overflow-hidden rounded-xl">
        {loading ? (
          <div className="p-12 text-center text-[13px] text-rf-on-surface-variant">
            Loading keys…
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rf-primary/10 text-rf-primary">
              <span className="material-symbols-outlined text-[28px]">key_off</span>
            </div>
            <h4 className="mt-3 text-[15px] font-bold text-rf-on-surface">No API keys yet</h4>
            <p className="mt-1 max-w-sm text-[12px] text-rf-on-surface-variant">
              Create your first API key to start integrating Reform
              with your applications.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="bg-rf-surface-container-low/50 text-[10px] uppercase tracking-widest text-rf-outline">
                <tr>
                  <th className="border-b border-rf-border-white-faint px-5 py-3">Name</th>
                  <th className="border-b border-rf-border-white-faint px-5 py-3">Key</th>
                  <th className="border-b border-rf-border-white-faint px-5 py-3">Status</th>
                  <th className="border-b border-rf-border-white-faint px-5 py-3">Permissions</th>
                  <th className="border-b border-rf-border-white-faint px-5 py-3">Last Used</th>
                  <th className="border-b border-rf-border-white-faint px-5 py-3">Created</th>
                  <th className="border-b border-rf-border-white-faint px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rf-border-white-faint text-[12px] text-rf-on-surface-variant">
                {keys.map((key) => (
                  <tr key={key.id} className="transition-colors hover:bg-rf-surface-variant/10">
                    <td className="px-5 py-4">
                      <div className="font-bold text-rf-on-surface">{key.name}</div>
                      {key.lastRotatedAt && (
                        <div className="text-[10px] text-rf-on-surface-variant/60">
                          Rotated {formatDate(key.lastRotatedAt)}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-rf-input-hollow-bg px-2 py-1 font-mono text-[11px] text-rf-on-surface">
                          {maskPrefix(key.keyPrefix)}
                        </code>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest ${
                          key.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rf-surface-container-high text-rf-outline'
                        }`}
                      >
                        {key.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {key.permissions.map((p) => (
                          <span
                            key={p}
                            className="rounded bg-rf-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-rf-primary"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[11px] opacity-70">
                      {formatDate(key.lastUsedAt)}
                    </td>
                    <td className="px-5 py-4 text-[11px] opacity-70">
                      {formatDate(key.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleRotate(key.id, key.name)}
                          disabled={key.status !== 'active'}
                          className="rounded-lg p-1.5 text-rf-on-surface-variant transition-colors hover:bg-rf-primary/10 hover:text-rf-primary disabled:cursor-not-allowed disabled:opacity-30"
                          title="Rotate key"
                        >
                          <span className="material-symbols-outlined text-[16px]">cached</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRevoke(key.id)}
                          disabled={key.status !== 'active'}
                          className="rounded-lg p-1.5 text-rf-on-surface-variant transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                          title="Revoke key"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-rf-surface-container shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-rf-primary">add_circle</span>
                <h2 className="text-[16px] font-bold text-rf-on-surface">Create API Key</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-1.5 text-rf-on-surface-variant hover:bg-white/5 hover:text-rf-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                  Key Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Production Webhook"
                  className="w-full rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2 text-[13px] text-rf-on-surface placeholder:text-rf-on-surface-variant/40 focus:border-rf-primary focus:outline-none"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                  Permissions
                </label>
                <div className="space-y-2">
                  {PERMISSION_SCOPES.map((scope) => (
                    <label
                      key={scope.value}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-rf-surface/50 p-3 transition-colors hover:border-rf-primary/30"
                    >
                      <input
                        type="checkbox"
                        checked={newPerms.includes(scope.value)}
                        onChange={() => togglePerm(scope.value)}
                        className="mt-0.5 h-4 w-4 accent-rf-primary"
                      />
                      <div>
                        <div className="text-[12px] font-semibold text-rf-on-surface">
                          {scope.label}
                        </div>
                        <div className="text-[11px] text-rf-on-surface-variant">
                          {scope.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg px-4 py-2 text-[13px] font-semibold text-rf-on-surface-variant hover:text-rf-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="btn-primary rounded-lg px-5 py-2 text-[13px] font-bold"
              >
                Create Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Created key dialog — shown once */}
      {createdKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-emerald-500/30 bg-rf-surface-container shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-emerald-400">
                  check_circle
                </span>
                <h2 className="text-[16px] font-bold text-rf-on-surface">Key Created</h2>
              </div>
              <button
                type="button"
                onClick={() => setCreatedKey(null)}
                className="rounded-lg p-1.5 text-rf-on-surface-variant hover:bg-white/5 hover:text-rf-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-5">
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <span className="material-symbols-outlined text-[18px] text-amber-400">warning</span>
                <div>
                  <div className="text-[12px] font-semibold text-amber-400">
                    Copy your key now — you won&apos;t see it again
                  </div>
                  <p className="mt-0.5 text-[11px] text-rf-on-surface-variant">
                    For security, the full key is only shown once. Store it in a
                    secure location like a password manager or secrets vault.
                  </p>
                </div>
              </div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                Your API Key
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdKey.key}
                  className="flex-1 rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2.5 font-mono text-[11px] text-rf-on-surface"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={() => handleCopy(createdKey.key, 'created')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-[12px] font-bold transition-colors ${
                    copied === 'created'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-rf-primary text-white hover:bg-rf-primary/90'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copied === 'created' ? 'check' : 'content_copy'}
                  </span>
                  {copied === 'created' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <div className="text-rf-on-surface-variant">Name</div>
                  <div className="font-semibold text-rf-on-surface">{createdKey.name}</div>
                </div>
                <div>
                  <div className="text-rf-on-surface-variant">Permissions</div>
                  <div className="font-semibold text-rf-on-surface">
                    {createdKey.permissions.length} scope{createdKey.permissions.length > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t border-white/10 px-5 py-4">
              <button
                type="button"
                onClick={() => setCreatedKey(null)}
                className="btn-primary rounded-lg px-5 py-2 text-[13px] font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rotated key dialog */}
      {rotatedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-rf-primary/30 bg-rf-surface-container shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-rf-primary">cached</span>
                <h2 className="text-[16px] font-bold text-rf-on-surface">Key Rotated</h2>
              </div>
              <button
                type="button"
                onClick={() => setRotatedKey(null)}
                className="rounded-lg p-1.5 text-rf-on-surface-variant hover:bg-white/5 hover:text-rf-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-5">
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <span className="material-symbols-outlined text-[18px] text-amber-400">warning</span>
                <div>
                  <div className="text-[12px] font-semibold text-amber-400">
                    Old key invalidated — copy the new key now
                  </div>
                  <p className="mt-0.5 text-[11px] text-rf-on-surface-variant">
                    The previous key for &quot;{rotatedKey.name}&quot; no longer works.
                    Update your integrations with the new key below.
                  </p>
                </div>
              </div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                New API Key
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={rotatedKey.key}
                  className="flex-1 rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2.5 font-mono text-[11px] text-rf-on-surface"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={() => handleCopy(rotatedKey.key, 'rotated')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-[12px] font-bold transition-colors ${
                    copied === 'rotated'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-rf-primary text-white hover:bg-rf-primary/90'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copied === 'rotated' ? 'check' : 'content_copy'}
                  </span>
                  {copied === 'rotated' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="flex justify-end border-t border-white/10 px-5 py-4">
              <button
                type="button"
                onClick={() => setRotatedKey(null)}
                className="btn-primary rounded-lg px-5 py-2 text-[13px] font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke confirmation */}
      {confirmRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-red-500/30 bg-rf-surface-container shadow-2xl">
            <div className="p-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                <span className="material-symbols-outlined text-[28px]">warning</span>
              </div>
              <h3 className="mt-3 text-[16px] font-bold text-rf-on-surface">Revoke this key?</h3>
              <p className="mt-1 text-[12px] text-rf-on-surface-variant">
                This action cannot be undone. Any application using this key will
                immediately lose access.
              </p>
            </div>
            <div className="flex gap-2 border-t border-white/10 px-5 py-4">
              <button
                type="button"
                onClick={() => setConfirmRevoke(null)}
                className="flex-1 rounded-lg border border-white/10 bg-rf-surface/50 py-2 text-[13px] font-semibold text-rf-on-surface-variant hover:text-rf-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRevoke(confirmRevoke)}
                className="flex-1 rounded-lg bg-red-500 py-2 text-[13px] font-bold text-white hover:bg-red-600"
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
