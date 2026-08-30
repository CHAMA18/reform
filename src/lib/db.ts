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
  // IMPORTANT: Xano's `search` parameter supports ONLY SINGLE-FIELD
  // equality. Multi-field searches are silently broken — they return
  // rows matching ANY condition (OR semantics), not all conditions.
  // Xano's `filter` parameter is also broken — returns all rows.
  //
  // So: we pick ONE field to send to Xano (the first one we encounter
  // that has a simple equality value), and the caller filters the rest
  // in memory. See `filterInMemory` below.
  for (const [appField, rawCond] of Object.entries(where)) {
    const xanoField = appNameToXano(model, appField);
    if (rawCond && typeof rawCond === 'object' && !Array.isArray(rawCond)
        && !(rawCond instanceof Date)) {
      // Operator object — only `equals` (or single-value `in`) is supported
      if ('equals' in rawCond) {
        return {
          _field: xanoField,
          _value: rawCond.equals instanceof Date ? rawCond.equals.getTime() : rawCond.equals,
        };
      } else if ('in' in rawCond && Array.isArray(rawCond.in) && rawCond.in.length === 1) {
        return { _field: xanoField, _value: rawCond.in[0] };
      }
      // Other operators — skip; not supported by Xano search
    } else {
      // Direct equality
      return {
        _field: xanoField,
        _value: rawCond instanceof Date ? rawCond.getTime() : rawCond,
      };
    }
  }
  return undefined;
}

/**
 * Filter a list of records in memory by the FULL where clause.
 * Used after a single-field Xano search to apply the remaining conditions.
 *
 * Supports:
 *   - direct equality: { field: value }
 *   - operator `equals`: { field: { equals: value } }
 *   - operator `in`: { field: { in: [v1, v2, ...] } }
 *   - operator `gt`, `gte`, `lt`, `lte`: numeric/date comparison
 *   - operator `contains`: substring match (case-insensitive)
 *   - operator `not` / `notIn`: negation
 */
function filterInMemory<T>(records: T[], where: Record<string, any> | undefined, model: ModelName): T[] {
  if (!where || Object.keys(where).length === 0) return records;
  return records.filter((rec: any) => {
    for (const [appField, cond] of Object.entries(where)) {
      const xanoField = appNameToXano(model, appField);
      const actual = rec[xanoField] ?? rec[appField]; // be lenient about field name

      if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
        // Operator object
        if ('equals' in cond) {
          const v = cond.equals instanceof Date ? cond.equals.getTime() : cond.equals;
          if (actual !== v) return false;
        }
        if ('gt' in cond) {
          const v = cond.gt instanceof Date ? cond.gt.getTime() : cond.gt;
          if (!(actual > v)) return false;
        }
        if ('gte' in cond) {
          const v = cond.gte instanceof Date ? cond.gte.getTime() : cond.gte;
          if (!(actual >= v)) return false;
        }
        if ('lt' in cond) {
          const v = cond.lt instanceof Date ? cond.lt.getTime() : cond.lt;
          if (!(actual < v)) return false;
        }
        if ('lte' in cond) {
          const v = cond.lte instanceof Date ? cond.lte.getTime() : cond.lte;
          if (!(actual <= v)) return false;
        }
        if ('in' in cond && Array.isArray(cond.in)) {
          if (!cond.in.includes(actual)) return false;
        }
        if ('notIn' in cond && Array.isArray(cond.notIn)) {
          if (cond.notIn.includes(actual)) return false;
        }
        if ('contains' in cond) {
          if (typeof actual !== 'string' || !actual.toLowerCase().includes(String(cond.contains).toLowerCase())) {
            return false;
          }
        }
        if ('not' in cond) {
          if (actual === cond.not) return false;
        }
      } else {
        // Direct equality
        const v = cond instanceof Date ? cond.getTime() : cond;
        if (actual !== v) return false;
      }
    }
    return true;
  });
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

async function includeRelations(model: ModelName, record: any, include: Record<string, any> | undefined): Promise<any> {
  if (!include) return record;
  let result = { ...record };
  // session.findUnique({ include: { user: true } }) or { include: { user: { select: {...} } } }
  if (model === 'session' && include.user) {
    const userId = record.userId;
    if (userId) {
      const select = (include.user === true) ? undefined : include.user.select;
      const user = await findOne<User>('user', { where: { id: userId }, select });
      result.user = user;
    }
  }
  // submission.findMany({ include: { form: ... } })
  if (model === 'submission' && include.form) {
    const formId = record.formId;
    if (formId) {
      const select = (include.form === true) ? undefined : include.form.select;
      const form = await findOne<Form>('form', { where: { id: formId }, select });
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
  // Xano search only supports ONE field — use it as the primary filter
  const body: any = { page: 1, per_page: 50 };
  if (filter) body.search = { [filter._field]: filter._value };

  const resp = await xanoRequest('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${tableId}/content/search`, body);
  let items = resp?.items ?? [];
  // Apply any additional where conditions in memory (Xano multi-field search is broken)
  items = filterInMemory(items, args.where, model);
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
  // Fetch more than `take` because we filter in memory afterwards.
  // Use a generous upper bound (200) so multi-field filters work.
  const perPage = Math.max(args.take ?? 50, 200);
  const page = 1;

  const body: any = { page, per_page: perPage };
  if (filter) body.search = { [filter._field]: filter._value };
  if (sort) body.sort = sort;

  const resp = await xanoRequest('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${tableId}/content/search`, body);
  let items = resp?.items ?? [];
  // Apply any additional where conditions in memory
  items = filterInMemory(items, args.where, model);
  // Apply skip + take in memory (since Xano pagination is now invalid
  // after we filter in memory)
  if (args.skip) items = items.slice(args.skip);
  if (args.take) items = items.slice(0, args.take);
  // Attach relation counts if `_count: { select: {...} }` was requested.
  // The select shape is: { _count: { select: { submissions: true } } }
  const countSelect = (args.select?._count as any)?.select as Record<string, boolean> | undefined;
  const records = await Promise.all(items.map(async (it: any) => {
    let record = xanoRecordToApp<T>(model, it);
    if (countSelect) {
      record = await attachRelationCounts(model, record, countSelect);
    }
    if (args.include) {
      record = await includeRelations(model, record, args.include);
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
  const searchBody: any = { page: 1, per_page: 50 };
  if (filter) searchBody.search = { [filter._field]: filter._value };
  const searchResp = await xanoRequest('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${TABLE_ID[model]}/content/search`, searchBody);
  let matchingItems = filterInMemory(searchResp?.items ?? [], where, model);
  const xanoId = matchingItems[0]?.id;
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
  // Find the Xano int id (single-field search + in-memory filter for multi-field where)
  const filter = buildFilter(model, where);
  const searchBody: any = { page: 1, per_page: 50 };
  if (filter) searchBody.search = { [filter._field]: filter._value };
  const searchResp = await xanoRequest('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${TABLE_ID[model]}/content/search`, searchBody);
  const matchingItems = filterInMemory(searchResp?.items ?? [], where, model);
  const xanoId = matchingItems[0]?.id;
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
  // Search for all matching records, then delete them one by one.
  // (Xano's /content/search/delete endpoint ignores the `search` parameter,
  // so we have to fetch IDs first.)
  const filter = buildFilter(model, where);
  const searchBody: any = { page: 1, per_page: 500 };
  if (filter) searchBody.search = { [filter._field]: filter._value };
  const searchResp = await xanoRequest('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${TABLE_ID[model]}/content/search`, searchBody);
  const items = filterInMemory(searchResp?.items ?? [], where, model);
  let deleted = 0;
  for (const item of items) {
    if (item?.id) {
      try {
        await xanoRequest('DELETE', `/workspace/${XANO_WORKSPACE_ID}/table/${TABLE_ID[model]}/content/${item.id}`);
        deleted++;
      } catch (e) {
        // continue deleting the rest
      }
    }
  }
  return { count: deleted };
}

async function countRecords(model: ModelName, where: Record<string, any> | undefined): Promise<number> {
  // Xano's search endpoint returns `itemsTotal` for the matching count,
  // but `itemsTotal` is the count of records returned by the SINGLE-FIELD
  // search — for multi-field filters we need to count after in-memory filtering.
  const filter = buildFilter(model, where);
  const body: any = { page: 1, per_page: 500 };
  if (filter) body.search = { [filter._field]: filter._value };
  const resp = await xanoRequest('POST', `/workspace/${XANO_WORKSPACE_ID}/table/${TABLE_ID[model]}/content/search`, body);
  const items = filterInMemory(resp?.items ?? [], where, model);
  return items.length;
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

// ---------------------------------------------------------------------------
// Xano function invocation — lets app code call XanoScript function stacks.
// All AI features route through this so business logic stays in Xano.
// ---------------------------------------------------------------------------

/**
 * Invoke a Xano function stack by name. The function must already exist in
 * the workspace (created via the Xano metadata API or Xano Studio UI).
 *
 * @example
 *   const result = await xano.runFunction('ai/generate_form', {
 *     prompt: 'Create a 5-question NPS survey',
 *     user_id: currentUser.id,
 *   });
 */
export async function runFunction<T = any>(
  name: string,
  input: Record<string, any>,
): Promise<T> {
  const body = { name, input };
  const resp = await xanoRequest('POST', `/workspace/${XANO_WORKSPACE_ID}/function/run`, body);
  if (!resp || typeof resp !== 'object') {
    throw new Error(`Xano function '${name}' failed: no response`);
  }
  // Xano wraps the result in { result: { status, timing, result, logs } }
  const inner = resp.result ?? resp;
  if (inner.status && inner.status !== 'ok') {
    throw new Error(`Xano function '${name}' returned status=${inner.status}: ${JSON.stringify(inner)}`);
  }
  return (inner.result ?? inner) as T;
}

// Re-export auth helpers that some callsites expect from @/lib/db
export { hashPassword, verifyPassword, generateSessionToken } from './auth';
