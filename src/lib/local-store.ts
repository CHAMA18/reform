/**
 * Local Store — in-memory fallback for when Xano is not configured.
 *
 * This module provides a simple in-memory key-value store that mirrors
 * the Xano data adapter's interface. It's used as a development fallback
 * when XANO_TOKEN is not set (e.g. during local dev without Xano).
 *
 * In production, the Xano adapter is always used.
 */

interface LocalRecord {
  id: string;
  [key: string]: any;
}

const stores: Record<string, LocalRecord[]> = {};

function getStore(name: string): LocalRecord[] {
  if (!stores[name]) stores[name] = [];
  return stores[name];
}

export const localStore = {
  findMany: (model: string, where?: Record<string, any>): LocalRecord[] => {
    const store = getStore(model);
    if (!where) return store;
    return store.filter((r) =>
      Object.entries(where).every(([k, v]) => r[k] === v)
    );
  },

  findUnique: (model: string, where: Record<string, any>): LocalRecord | null => {
    const store = getStore(model);
    return store.find((r) =>
      Object.entries(where).every(([k, v]) => r[k] === v)
    ) ?? null;
  },

  create: (model: string, data: Record<string, any>): LocalRecord => {
    const store = getStore(model);
    const record: LocalRecord = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...data,
    };
    store.push(record);
    return record;
  },

  update: (model: string, where: Record<string, any>, data: Record<string, any>): LocalRecord | null => {
    const store = getStore(model);
    const idx = store.findIndex((r) =>
      Object.entries(where).every(([k, v]) => r[k] === v)
    );
    if (idx === -1) return null;
    store[idx] = { ...store[idx], ...data };
    return store[idx];
  },

  delete: (model: string, where: Record<string, any>): boolean => {
    const store = getStore(model);
    const idx = store.findIndex((r) =>
      Object.entries(where).every(([k, v]) => r[k] === v)
    );
    if (idx === -1) return false;
    store.splice(idx, 1);
    return true;
  },

  count: (model: string, where?: Record<string, any>): number => {
    const store = getStore(model);
    if (!where) return store.length;
    return store.filter((r) =>
      Object.entries(where).every(([k, v]) => r[k] === v)
    ).length;
  },
};
