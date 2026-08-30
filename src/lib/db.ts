/**
 * Xano-backed database client — Prisma-compatible surface.
 *
 * This module replaces the original Prisma client (`@prisma/client`) so the
 * rest of the app code can be left unchanged. It exposes a `db` object with
 * the same shape: `db.user`, `db.session`, `db.form`, `db.submission`,
 * `db.apiKey`, `db.post` — each with the standard `findUnique`, `findFirst`,
 * `findMany`, `create`, `update`, `delete`, `deleteMany`, `count` methods.
 *
 * Under the hood, each method calls Xano's metadata-API content endpoints:
 *   GET    /workspace/{ws}/table/{table_id}/content            (list)
 *   POST   /workspace/{ws}/table/{table_id}/content            (create)
 *   POST   /workspace/{ws}/table/{table_id}/content/search     (search)
 *   GET    /workspace/{ws}/table/{table_id}/content/{id}       (read one)
 *   PUT    /workspace/{ws}/table/{table_id}/content/{id}       (update)
 *   DELETE /workspace/{ws}/table/{table_id}/content/{id}      (delete)
 *
 * Field name mapping: Prisma camelCase → Xano snake_case
 *   e.g. passwordHash   ↔ password_hash
 *        createdAt      ↔ created_at
 *        ownerId        ↔ owner_id
 *
 * ID semantics:
 *   - Prisma's cuid `id: String` → Xano `external_id: text` (Xano's
 *     auto-increment `int id` is invisible to the app)
 *   - Prisma's `id: DateTime @default(now())` (Submission) → Xano's
 *     `submitted_at: timestamp @default(now)`
 *
 * Auth: uses the Xano Metadata API token in `XANO_TOKEN` env var.
 */
import { createHash, randomBytes } from 'crypto';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const XANO_INSTANCE_API = process.env.XANO_INSTANCE_API
  ?? 'https://xt8f-5r1j-wrmy.n7e.xano.io/api:meta';
const XANO_TOKEN = process.env.XANO_TOKEN ?? '';
const XANO_WORKSPACE_ID = Number(process.env.XANO_WORKSPACE_ID ?? '2');

// Xano table IDs (from the provisioning step)
const TABLE_ID = {
  user: 3,
  post: 4,
  form: 5,
  submission: 6,
  api_key: 7,
  session: 8,
} as const;

type ModelName = keyof typeof TABLE_ID;

// ---------------------------------------------------------------------------
// Types — match Prisma's generated types
// ---------------------------------------------------------------------------

export type User = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  fullName: string | null;
  orgName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Post = {
  id: string;
  title: string;
  content: string | null;
  published: boolean;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Form = {
  id: string;
  shareId: string;
  name: string;
  description: string | null;
  flowchart: unknown; // JSON
  schema: unknown; // JSON
  status: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Submission = {
  id: Date; // Prisma uses DateTime @id @default(now())
  formId: string;
  data: unknown; // JSON
  source: string | null;
  status: string;
  form?: Form;
};

export type ApiKey = {
  id: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  status: string;
  permissions: unknown; // JSON
  ownerId: string;
  lastRotatedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Session = {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  user?: User;
};

// ---------------------------------------------------------------------------
// Field name conversion (camelCase ↔ snake_case)
// ---------------------------------------------------------------------------

function camelToSnake(s: string): string {
  return s.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// Special ID-mapping rules per model:
//   Prisma's `id` (string cuid) → Xano's `external_id`
//   Prisma's `id` (DateTime for Submission) → Xano's `submitted_at`
//
// These fields are returned to the app with their Prisma name; all other
// fields just go through camelCase ↔ snake_case conversion.
const ID_FIELD: Record<ModelName, { xano: string; type: 'string' | 'date' }> = {
  user:       { xano: 'external_id',  type: 'string' },
  post:       { xano: 'external_id',  type: 'string' },
  form:       { xano: 'external_id',  type: 'string' },
  api_key:    { xano: 'external_id',  type: 'string' },
  session:    { xano: 'external_id',  type: 'string' },
  submission: { xano: 'submitted_at', type: 'date'   },
};

// Convert an app-side (camelCase) field name → Xano-side (snake_case) field name.
// Handles the special `id` mapping per model.
function appNameToXano(model: ModelName, field: string): string {
  if (field === 'id') {
    return ID_FIELD[model].xano;
  }
  // FK fields that reference other tables' cuids are stored as text in Xano,
  // with the same convention as the app (e.g. `userId` → `user_id`).
  return camelToSnake(field);
}

// Convert a Xano-side (snake_case) field name → app-side (camelCase) field name.
function xanoNameToApp(model: ModelName, field: string): string {
  const idField = ID_FIELD[model];
  if (field === idField.xano) {
    return 'id';
  }
  return snakeToCamel(field);
}

// ---------------------------------------------------------------------------
// Value conversion (Date / JSON)
// ---------------------------------------------------------------------------

function xanoValueToApp(model: ModelName, field: string, value: unknown): unknown {
  // Xano returns timestamps as epoch milliseconds (number)
  if (value === null || value === undefined) return value;
  if ((field === 'createdAt' || field === 'updatedAt' || field === 'expiresAt'
       || field === 'lastRotatedAt' || field === 'lastUsedAt')
      && typeof value === 'number') {
    return new Date(value);
  }
  if (model === 'submission' && field === 'id' && typeof value === 'number') {
    // submitted_at returned as ms epoch
    return new Date(value);
  }
  // JSON-typed fields: Prisma stores them as serialized strings (the app code
  // does `JSON.parse(form.flowchart)`). Xano stores them as native objects,
  // so we re-stringify them on read to preserve the app's `JSON.parse(...)` pattern.
  if ((field === 'flowchart' || field === 'schema' || field === 'data' || field === 'permissions')
      && typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return value;
}

function appValueToXano(model: ModelName, field: string, value: unknown): unknown {
  if (value instanceof Date) {
    return value.getTime(); // Xano accepts epoch ms for timestamps
  }
  // JSON-typed fields: serialize objects to JSON strings (Xano accepts both)
  if ((field === 'flowchart' || field === 'schema' || field === 'data' || field === 'permissions')
      && typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Low-level Xano API client
// ---------------------------------------------------------------------------

async function xanoRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<any> {
  if (!XANO_TOKEN) {
    throw new Error('XANO_TOKEN is not set. Add it to .env (see .env.example).');
  }
  const url = `${XANO_INSTANCE_API}${path}`;
  const init: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${XANO_TOKEN}`,
      'Accept': 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    // Xano's TLS cert chain is fine but the metadata API sometimes is slow
    // to start. Give it generous timeouts.
    cache: 'no-store',
  };

  const resp = await fetch(url, init);
  const text = await resp.text();
  let parsed: any;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!resp.ok) {
    const msg = parsed?.message ?? text ?? `HTTP ${resp.status}`;
    const err = new Error(`Xano ${method} ${path} failed: ${msg}`);
    (err as any).status = resp.status;
    (err as any).body = parsed;
    throw err;
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Record conversion (Xano record ↔ app record)
// ---------------------------------------------------------------------------

function xanoRecordToApp<T>(model: ModelName, rec: any): T {
  if (!rec || typeof rec !== 'object') return rec;
  const out: any = {};
  for (const [k, v] of Object.entries(rec)) {
    // Skip the Xano auto-increment int id (the app never sees it)
    if (k === 'id') continue;
    const appField = xanoNameToApp(model, k);
    out[appField] = xanoValueToApp(model, appField, v);
  }
  return out as T;
}

function appRecordToXano(model: ModelName, rec: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rec)) {
    const xanoField = appNameToXano(model, k);
    out[xanoField] = appValueToXano(model, k, v);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Query / Where clause handling
// ---------------------------------------------------------------------------

/**
 * Convert a Prisma-style `where` clause into Xano's search filter format.
 *
 * Supported operators (Prisma):
 *   - direct equality: { field: value }
 *   - operators: { field: { gt: x, lt: y, in: [...] } }
 *
 * Xano's /content/search accepts a filter object like:
 *   { "field": value }                              (equality)
 *   { "field": { "$contains": "x" } }               (substring)
 *   { "field": { "$ne": value } }                   (not equal)
 *   { "$and": [...] }
 *   { "$or": [...] }
 *
 * (Xano uses $-prefixed operators; the actual full list is in their docs.)
 *
 * We map Prisma operators to Xano operators as follows:
 *   Prisma `equals`  → Xano direct equality
 *   Prisma `gt`       → Xano `$gt`
 *   Prisma `gte`      → Xano `$gte`
 *   Prisma `lt`       → Xano `$lt`
 *   Prisma `lte`      → Xano `$lte`
 *   Prisma `in`       → Xano `$in`
 *   Prisma `notIn`    → Xano `$nin`
 *   Prisma `contains` → Xano `$contains`
 *   Prisma `startsWith` → Xano `$begins`
 *   Prisma `endsWith` → Xano `$ends`
 */
function buildFilter(model: ModelName, where: Record<string, any> | undefined): Record<string, any> | undefined {
  if (!where || Object.keys(where).length === 0) return undefined;
  const filter: Record<string, any> = {};
  for (const [appField, rawCond] of Object.entries(where)) {
    const xanoField = appNameToXano(model, appField);
    if (rawCond && typeof rawCond === 'object' && !Array.isArray(rawCond)
        && !(rawCond instanceof Date)
        && Object.keys(rawCond).some(k =>
          ['equals', 'gt', 'gte', 'lt', 'lte', 'in', 'notIn', 'contains', 'startsWith', 'endsWith', 'not', 'mode'].includes(k))) {
      // Operator object
      const op: Record<string, any> = {};
      for (const [opName, opVal] of Object.entries(rawCond)) {
        const v = opVal instanceof Date ? opVal.getTime() : opVal;
        switch (opName) {
          case 'equals':  op['$eq'] = v; break;
          case 'gt':      op['$gt'] = v; break;
          case 'gte':     op['$gte'] = v; break;
          case 'lt':      op['$lt'] = v; break;
          case 'lte':     op['$lte'] = v; break;
          case 'in':      op['$in'] = v; break;
          case 'notIn':   op['$nin'] = v; break;
          case 'contains': op['$contains'] = v; break;
          case 'startsWith': op['$begins'] = v; break;
          case 'endsWith':  op['$ends'] = v; break;
          case 'not':     op['$ne'] = v; break;
          case 'mode':    break; // sensitivity hint; ignored
          default:        op[opName] = v; break; // pass-through
        }
      }
      filter[xanoField] = op;
    } else {
      // Direct equality
      filter[xanoField] = rawCond instanceof Date ? rawCond.getTime() : rawCond;
    }
  }
  return filter;
}

// ---------------------------------------------------------------------------
// Model adapter — implements Prisma's API surface
// ---------------------------------------------------------------------------

type PrismaArgs<T> = {
  where?: Partial<T> & Record<string, any>;
  orderBy?: Partial<Record<keyof T, 'asc' | 'desc'>> & Record<string, 'asc' | 'desc'>;
  skip?: number;
  take?: number;
  select?: Partial<Record<keyof T, boolean>>;
  include?: Record<string, boolean>;
  data?: Partial<T> & Record<string, any>;
};

function buildOrderBy(model: ModelName, orderBy: Record<string, 'asc' | 'desc'> | undefined): any {
  if (!orderBy) return undefined;
  // Xano's search accepts `sort` as an OBJECT keyed by field name
  // (e.g. {"created_at": "desc", "id": "asc"}). Multiple keys are
  // applied in object-iteration order; we preserve insertion order.
  const out: Record<string, 'asc' | 'desc'> = {};
  for (const [appField, dir] of Object.entries(orderBy)) {
    out[appNameToXano(model, appField)] = dir;
  }
  return out;
}

function projectSelect<T>(record: T, select: Record<string, boolean> | undefined): Partial<T> {
  if (!select) return record;
  const out: any = {};
  for (const [k, v] of Object.entries(select)) {
    if (v && k in (record as any)) {
      out[k] = (record as any)[k];
    }
  }
  // Preserve _count if it was requested and is on the record
  if (select._count && (record as any)._count) {
    out._count = (record as any)._count;
  }
  return out;
}

async function includeRelations(model: ModelName, record: any, include: Record<string, boolean> | undefined): Promise<any> {
  if (!include) return record;
  let result = { ...record };
  // Only `session.findUnique({ include: { user: true } })` is used in the codebase
  if (model === 'session' && include.user) {
    const userId = record.userId;
    if (userId) {
      const user = await findOne<User>('user', { where: { id: userId } });
      result.user = user;
    }
  }
  if (model === 'submission' && include.form) {
    const formId = record.formId;
    if (formId) {
      const form = await findOne<Form>('form', { where: { id: formId } });
      result.form = form;
    }
  }
  return result;
}

// Prisma's `_count: { select: { related: true } }` — fetches counts of
// related records for each result row. Only Form._count.submissions and
// Form._count.apiKeys are used in the dashboard; we implement just those.
async function attachRelationCounts(model: ModelName, record: any, countSelect: Record<string, boolean> | undefined): Promise<any> {
  if (!countSelect) return record;
  const result: any = { ...record, _count: {} };
  if (model === 'form' && countSelect.submissions) {
    result._count.submissions = await countRecords('submission', { formId: record.id });
  }
  if (model === 'form' && countSelect.apiKeys) {
    // Forms don't actually have a direct apiKey relation in our schema; return 0
    result._count.apiKeys = 0;
  }
  if (model === 'user' && countSelect.forms) {
    result._count.forms = await countRecords('form', { ownerId: record.id });
  }
  return result;
}

// Generic single-record fetch (returns null if not found)
async function findOne<T>(model: ModelName, args: { where: Record<string, any>; select?: Record<string, boolean>; include?: Record<string, boolean> }): Promise<T | null> {
  const tableId = TABLE_ID[model];
  const filter = buildFilter(model, args.where);
  const body: any = { page: 1, per_page: 1 };
  if (filter) body.filter = filter;

  const resp = await xanoRequest('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${tableId}/content/search`, body);
  const items = resp?.items ?? [];
  if (items.length === 0) return null;
  const record = xanoRecordToApp<T>(model, items[0]);
  const withRelations = await includeRelations(model, record, args.include);
  return projectSelect(withRelations, args.select) as T;
}

// Generic multi-record fetch
async function findMany<T>(model: ModelName, args: {
  where?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  skip?: number;
  take?: number;
  select?: Record<string, boolean>;
  include?: Record<string, boolean>;
} = {}): Promise<T[]> {
  const tableId = TABLE_ID[model];
  const filter = buildFilter(model, args.where);
  const sort = buildOrderBy(model, args.orderBy);
  const page = args.skip !== undefined && args.take !== undefined
    ? Math.floor(args.skip / args.take) + 1
    : 1;
  const perPage = args.take ?? 50;

  const body: any = { page, per_page: perPage };
  if (filter) body.filter = filter;
  if (sort) body.sort = sort;

  const resp = await xanoRequest('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${tableId}/content/search`, body);
  const items = resp?.items ?? [];
  // Attach relation counts if `_count: { select: {...} }` was requested.
  // The select shape is: { _count: { select: { submissions: true } } }
  const countSelect = (args.select?._count as any)?.select as Record<string, boolean> | undefined;
  const records = await Promise.all(items.map(async (it: any) => {
    let record = xanoRecordToApp<T>(model, it);
    if (countSelect) {
      record = await attachRelationCounts(model, record, countSelect);
    }
    return record;
  }));
  return records.map((r: T) => projectSelect(r, args.select) as T);
}

async function createOne<T>(model: ModelName, data: Record<string, any>): Promise<T> {
  const tableId = TABLE_ID[model];
  const payload: Record<string, any> = { ...data };
  // Submission: Prisma uses `id DateTime @default(now())` as the PK. Materialise
  // that as the Xano `submitted_at` timestamp (mapped via appNameToXano).
  if (model === 'submission') {
    payload.id = Date.now();
  }
  // Form model: Prisma's `shareId String @unique @default(cuid())` — generate if missing.
  if (model === 'form' && !('shareId' in payload)) {
    payload.shareId = generateCuid();
  }
  // Every table has a unique index on `external_id` (the Prisma cuid mapping).
  // Generate one if the app didn't supply it. (For non-submission models, the
  // app reads this back as `id` thanks to the appNameToXano → xanoNameToApp
  // round-trip; for submission the app reads `submitted_at` as `id` instead.)
  if (!('externalId' in payload) && !('external_id' in payload)) {
    payload.externalId = generateCuid();
  }
  const xanoPayload = appRecordToXano(model, payload);
  const resp = await xanoRequest('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${tableId}/content`, xanoPayload);
  return xanoRecordToApp<T>(model, resp);
}

async function updateOne<T>(model: ModelName, where: Record<string, any>, data: Record<string, any>): Promise<T> {
  // Find the Xano record first (to get its int id)
  const existing = await findOne<any>(model, { where });
  if (!existing) {
    const err = new Error(`Record not found: ${JSON.stringify(where)}`);
    (err as any).code = 'P2025';
    throw err;
  }
  // The Xano int id is not exposed to the app — but we stored it during the
  // xanoRecordToApp call. Wait — we actually skipped it. So we need to look it
  // up differently: re-fetch with the filter and ask Xano to return the int id.
  // Easiest: query the table directly via /content (not /search) and grab the id.
  const filter = buildFilter(model, where);
  const searchResp = await xanoRequest('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${TABLE_ID[model]}/content/search`, {
    filter, page: 1, per_page: 1,
  });
  const xanoId = searchResp?.items?.[0]?.id;
  if (!xanoId) {
    const err = new Error(`Record not found: ${JSON.stringify(where)}`);
    (err as any).code = 'P2025';
    throw err;
  }
  // Build the update payload (app field names → xano field names)
  const xanoPayload = appRecordToXano(model, data);
  // Always bump updated_at (Xano's `default: now` only applies on insert)
  if (!('updated_at' in xanoPayload)) {
    xanoPayload.updated_at = Date.now();
  }
  const resp = await xanoRequest('PUT', `/workspace/${XANO_WORKSPACE_ID}/table/${TABLE_ID[model]}/content/${xanoId}`, xanoPayload);
  return xanoRecordToApp<T>(model, resp);
}

async function deleteOne(model: ModelName, where: Record<string, any>): Promise<void> {
  // Find the Xano int id
  const filter = buildFilter(model, where);
  const searchResp = await xanoRequest('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${TABLE_ID[model]}/content/search`, {
    filter, page: 1, per_page: 1,
  });
  const xanoId = searchResp?.items?.[0]?.id;
  if (!xanoId) {
    // Prisma returns null if the record doesn't exist; emulate that.
    return;
  }
  await xanoRequest('DELETE', `/workspace/${XANO_WORKSPACE_ID}/table/${TABLE_ID[model]}/content/${xanoId}`);
}

async function deleteMany(model: ModelName, where: Record<string, any> | undefined): Promise<{ count: number }> {
  if (!where || Object.keys(where).length === 0) {
    // Refuse to delete-all in absence of a filter (matches Prisma's safe default)
    return { count: 0 };
  }
  const filter = buildFilter(model, where);
  // Use the search+delete endpoint: POST /content/search/delete
  const resp = await xanoRequest('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${TABLE_ID[model]}/content/search/delete`, { filter });
  return { count: resp?.affected ?? resp?.count ?? 0 };
}

async function countRecords(model: ModelName, where: Record<string, any> | undefined): Promise<number> {
  // Xano's search endpoint returns `itemsTotal` for the matching count.
  const filter = buildFilter(model, where);
  const body: any = { page: 1, per_page: 1 };
  if (filter) body.filter = filter;
  const resp = await xanoRequest('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${TABLE_ID[model]}/content/search`, body);
  return resp?.itemsTotal ?? 0;
}

// ---------------------------------------------------------------------------
// CUID generator (Xano doesn't generate cuids; the app expects them)
// ---------------------------------------------------------------------------

function generateCuid(): string {
  // Simplified cuid2-like ID: 24-char base36
  const ts = Date.now().toString(36).padStart(9, '0');
  const rand = randomBytes(12).toString('hex').slice(0, 15);
  return `c${ts}${rand}`;
}

// ---------------------------------------------------------------------------
// Public `db` object — drop-in replacement for PrismaClient
// ---------------------------------------------------------------------------

function makeModel<T extends Record<string, any>>(model: ModelName) {
  return {
    findUnique: (args: { where: Record<string, any>; select?: Record<string, boolean>; include?: Record<string, boolean> }): Promise<T | null> =>
      findOne<T>(model, args),
    findFirst: (args: { where: Record<string, any>; select?: Record<string, boolean>; include?: Record<string, boolean> }): Promise<T | null> =>
      findOne<T>(model, args),
    findMany: (args?: PrismaArgs<T>): Promise<T[]> =>
      findMany<T>(model, args ?? {}),
    create: (args: { data: Record<string, any> }): Promise<T> =>
      createOne<T>(model, args.data),
    update: (args: { where: Record<string, any>; data: Record<string, any> }): Promise<T> =>
      updateOne<T>(model, args.where, args.data),
    delete: (args: { where: Record<string, any> }): Promise<T> =>
      deleteOne(model, args.where).then(() => ({} as T)),  // Prisma returns the deleted record; we return empty
    deleteMany: (args?: { where?: Record<string, any> }): Promise<{ count: number }> =>
      deleteMany(model, args?.where),
    count: (args?: { where?: Record<string, any> }): Promise<number> =>
      countRecords(model, args?.where),
  };
}

export const db = {
  user:       makeModel<User>('user'),
  post:       makeModel<Post>('post'),
  form:       makeModel<Form>('form'),
  submission: makeModel<Submission>('submission'),
  apiKey:     makeModel<ApiKey>('api_key'),
  session:    makeModel<Session>('session'),
};

// Re-export auth helpers that some callsites expect from @/lib/db
export { hashPassword, verifyPassword, generateSessionToken } from './auth';
