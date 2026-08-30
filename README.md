# Reform — Dynamic Form Builder Engine

A world-class form builder platform with a visual flowchart editor, dynamic validation engine, REST API, **10 AI features**, and **Xano as the backend**.

> Built for the Xano Hackathon: **"Rebuild a SaaS Tool You Hate"**.
> Reform replaces Typeform + Zapier + Airtable + Metabase + Customer.io + Hotjar + Localize — AI-native, Xano-powered, $99/mo instead of $485/mo.

## Demo Video

<a href="https://www.loom.com/share/05d568bf4e314ae79a8eb902ecd5aa61" target="_blank" rel="noopener">
  <img src="public/images/loom-demo-thumbnail.gif" alt="Reform Demo — click to play" width="1024" height="596" style="max-width:100%;border-radius:12px;border:1px solid #292524;" />
</a>

**[▶ Watch the walkthrough on Loom](https://www.loom.com/share/05d568bf4e314ae79a8eb902ecd5aa61)** — See the flowchart builder, validation engine, API, and deployment in action.

## Features

### Core form builder
- **Visual Flowchart Builder** — Drag-and-drop node editor for designing forms
- **Dynamic Validation** — Validation rules stored in form config, evaluated at runtime via Zod (no hardcoded rules)
- **13 Field Types** — text, email, password, number, tel, url, textarea, dropdown, radio, checkbox, date, rating, file
- **Conditional Logic** — Branch form flow based on field values (true/false paths)
- **6 Starter Templates** — KYC, Feedback, Event Registration, Support Ticket, Job Application, Contact Form
- **Public Form Rendering** — Shareable links at `/f/{shareId}`
- **REST API v1** — Full programmatic access with API key authentication
- **API Key Management** — Create, rotate, and revoke keys with scoped permissions
- **Real-time Dashboard** — Live form counts, submission stats, and form library
- **Guided Walkthrough** — 22-step interactive tour across all sections
- **Submission Tracking** — Searchable, expandable submission table with JSON payload viewer

### 🤖 AI features (10 — all powered by Xano function stacks)

**Tier 1 — Builder productivity**
1. **AI Form Generator** (`/forms/ai`) — Type a prompt → AI builds a complete flowchart in ~3s
2. **AI Submission Insights** (`/forms/[id]/insights`) — Summarise 200 submissions into 3 bullets + sentiment breakdown + topic clusters + standout quotes
3. **Smart Field Suggestions** (in builder) — Type a field label → AI suggests type, placeholder, validation rules, options

**Tier 2 — Reimagining the form experience**
4. **Conversational Form Mode** (`/f/{shareId}/chat`) — Bot walks the user through questions, follows conditional logic, writes submission at the end
5. **AI Smart Routing** (`/forms/[id]/routing`) — Write rules in plain English ("if feedback mentions billing, email finance@acme.com") — AI evaluates on every submission
6. **AI Auto-Translation** (`/forms/[id]/translate`) — One-click translate all field text to 10 languages

**Tier 3 — Polish + reach**
7. **Voice-First Submission Mode** (`/f/{shareId}/voice`) — 🎤 mic button on the chat → ASR transcribes → bot extracts structured answer
8. **AI Field Drop-off Analytics** (`/forms/[id]/analytics`) — Tracks focus/blur/input/abandon events per field, AI suggests specific fixes
9. **Auto-Generated PDF Reports** (`/api/submissions/[id]/pdf`) — Branded PDF per submission, includes AI-written "Analyst notes"
10. **Embeddable React Widget SDK** (`/sdk-demo`) — `<ReformForm shareId="..." mode="standard|conversational|voice" />` for any site

### 🗄️ Xano architecture (backend, not just a database)

Reform uses Xano as the **backend in a meaningful way** — real API groups, real function stacks with business logic, a scheduled task, and Xano auth:

- **12 Xano tables**: user, post, form, submission, api_key, session, ai_generation_log, form_insight, form_translation, form_routing_rule, field_event, conversation
- **6 XanoScript function stacks** with real business logic:
  - `ai/validate_and_log_form` — validates AI-generated flowcharts, logs to ai_generation_log
  - `ai/save_form_insight` — caches AI submission insights per form
  - `ai/log_field_suggestion` — generic AI audit logger (used by 7 features)
  - `ai/orchestrate_form_generation` — orchestrates form generation (start/complete lifecycle)
  - `ai/orchestrate_insights` — fetches submissions + checks cache + logs (full orchestration)
  - `ai/evaluate_routing` — keyword-based routing rule evaluation in XanoScript
- **1 Xano API group** (`/api:reform/`) with 6 public REST endpoints:
  - `GET /forms` — list user's forms
  - `GET /forms/{id}` — get single form
  - `GET /submissions` — list form submissions
  - `POST /submissions` — submit form data
  - `GET /ai/audit-log` — AI audit trail (proof all AI calls go through Xano)
  - `GET /health` — health check
- **1 scheduled task**: `refresh_insights` — nightly at 2am UTC, checks cached insights and marks stale ones for refresh
- **Xano auth**: the `user` table is marked as Xano's auth table
- **Audit trail**: every AI invocation across all 10 features is logged in `ai_generation_log` (prompt, model, tokens, latency, status). Judges can query this table via the public REST endpoint or Xano Studio.

---

## Quick Start

Reform ships with a containerised setup (Docker Compose) and a one-command local dev script. Choose whichever you prefer.

### Option A — Docker Compose (recommended, zero prerequisites)

Spins up PostgreSQL 16 + the Reform app in two containers with one command. No need to install Node.js, PostgreSQL, or any dependencies on your host machine.

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/install/) (Docker Desktop includes both).

```bash
# 1. Clone the repository
git clone https://github.com/CHAMA18/reform.git
cd reform

# 2. Start the stack (builds the image on first run — takes ~3-5 min)
docker compose up

# → App:   http://localhost:3000
# → DB:    localhost:5432 (user: reform, password: reform_password, db: reform)
```

The first `docker compose up` builds the Next.js production bundle inside the container. Subsequent starts are instant (layers are cached). The app automatically:

1. Waits for PostgreSQL to accept connections
2. Pushes the Prisma schema (creates all tables)
3. Starts the Next.js standalone server

**Background mode** (detached):

```bash
docker compose up -d              # start in background
docker compose logs -f app        # tail app logs
docker compose logs -f db         # tail database logs
docker compose down               # stop (data is preserved in a volume)
docker compose down -v            # stop + delete all database data
```

**Verify it's running:**

```bash
curl http://localhost:3000/                                 # → 200 OK (HTML)
curl http://localhost:3000/api/auth/guest -L -o /dev/null   # → guest sign-in, 200
```

---

### Option B — Local dev script (requires Node.js + PostgreSQL)

If you already have Node.js and PostgreSQL installed locally, use the included `scripts/dev.sh` script. It handles dependency installation, database creation, schema migration, and server startup in one command.

**Prerequisites:**
- [Node.js 20+](https://nodejs.org/)
- [PostgreSQL 16+](https://www.postgresql.org/download/) running on `localhost:5432`

```bash
# 1. Clone
git clone https://github.com/CHAMA18/reform.git
cd reform

# 2. Run the dev script (creates .env, installs deps, creates DB, starts server)
./scripts/dev.sh

# → App: http://localhost:3000
```

**Flags:**

```bash
./scripts/dev.sh --reset     # Reset the database first (drops all data!)
./scripts/dev.sh --build     # Build + run the production server instead of dev
```

The script will:
1. Create `.env` from `.env.example` (if missing)
2. Ensure the PostgreSQL user `reform` and database `reform` exist
3. Run `npm install` (if `node_modules` is missing)
4. Run `npx prisma generate` + `npx prisma db push` (create/migrate tables)
5. Start `npm run dev` (hot-reloading dev server)

---

### Option C — Manual setup (full control)

If you want to run each step yourself:

```bash
git clone https://github.com/CHAMA18/reform.git
cd reform

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL to your PostgreSQL connection string

# Generate the Prisma client + push schema to the database
npx prisma generate
npx prisma db push

# Start the dev server
npm run dev
# → http://localhost:3000
```

**Just want the database in Docker?** You can run PostgreSQL in a container and the app on your host:

```bash
docker run -d --name reform-db -p 5432:5432 \
  -e POSTGRES_USER=reform -e POSTGRES_PASSWORD=reform_password \
  -e POSTGRES_DB=reform postgres:16-alpine
```

Then proceed with the manual steps above.

---

### Verifying your setup

Regardless of which option you chose, verify the app is working:

```bash
# 1. Home page loads
curl -sS http://localhost:3000/ | grep -o '<title>[^<]*</title>'
# → <title>Reform | Precision Technical Infrastructure</title>

# 2. Guest sign-in works (creates a session + redirects to /dashboard)
curl -sS -L -o /dev/null -w '%{http_code} %{url_effective}\n' http://localhost:3000/api/auth/guest
# → 200 http://localhost:3000/dashboard

# 3. API is reachable (should return 401 without a key)
curl -sS http://localhost:3000/api/v1/forms
# → {"error":"Missing API key..."}

# 4. Run the full API integration test suite (57 tests)
bash scripts/test-api-integration.sh
```

---

## Test Credentials

The hosted deployment at **https://reform-7jo8.onrender.com** supports three ways to sign in. For evaluation convenience, a pre-provisioned test account is available — no signup required.

### Option 1 — Guest sign-in (fastest, no credentials needed)

Click **"Sign In As A Guest"** on the sign-in page, or navigate directly to:

```
https://reform-7jo8.onrender.com/api/auth/guest
```

This creates a unique guest account (one per browser) and redirects to the dashboard. Each guest's forms, submissions, and API keys are private to that browser. Repeat visits from the same browser reuse the same guest account (via a 30-day cookie).

### Option 2 — Email/password test account

A pre-provisioned test account is available for evaluators:

| Field | Value |
|-------|-------|
| **Email** | `evaluator@reform.app` |
| **Password** | `test123456` |

Sign in at **https://reform-7jo8.onrender.com/signin** with these credentials. This account has its own private workspace — forms, submissions, and API keys created here are invisible to guest sessions and other accounts.

> **Note:** If the test account doesn't exist (e.g., after a database reset), you can recreate it via the signup page at `/signup` with the same email and password, or via the API:
> ```bash
> curl -X POST https://reform-7jo8.onrender.com/api/auth/register \
>   -H "Content-Type: application/json" \
>   -d '{"email":"evaluator@reform.app","password":"test123456","fullName":"Test Evaluator"}'
> ```

### Option 3 — Create your own account

Sign up at **https://reform-7jo8.onrender.com/signup** with any email and password (minimum 6 characters). Each account is entirely separate — your forms, submissions, and API keys are invisible to other accounts.

### API access (for programmatic testing)

Once signed in (via any of the above), create an API key at **https://reform-7jo8.onrender.com/api-keys** and use it to test the REST API:

```bash
# List forms (replace with your API key)
curl https://reform-7jo8.onrender.com/api/v1/forms \
  -H "Authorization: Bearer fep_live_YOUR_KEY_HERE"

# Create a form
curl -X POST https://reform-7jo8.onrender.com/api/v1/forms \
  -H "Authorization: Bearer fep_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Test Form","flowchart":{"nodes":[{"id":"s","type":"start","position":{"x":0,"y":0},"data":{"label":"Start"}},{"id":"e","type":"field","position":{"x":100,"y":0},"data":{"label":"Email","fieldType":"email","required":true}},{"id":"sub","type":"submit","position":{"x":200,"y":0},"data":{"label":"Submit"}}],"edges":[{"id":"1","source":"s","target":"e"},{"id":"2","source":"e","target":"sub"}]}}'
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/db?schema=public`) |

Authentication is fully self-contained — email/password sign-in, email/password
sign-up, and a one-click **"Sign In As A Guest"** mode that creates a shared
guest account. No third-party OAuth providers or external auth services are
used, so no client IDs, secrets, or Supabase keys are required.

Copy `.env.example` to `.env` and adjust:

```bash
cp .env.example .env
```

---

## Database Schema

The app uses Prisma ORM with PostgreSQL. Three main models:

### Form
Stores the form configuration as JSONB:
- `flowchart` — the visual node/edge graph (source of truth)
- `schema` — the generated field definitions + validation rules
- `shareId` — public URL slug for `/f/{shareId}`
- `status` — "draft" or "published"

### Submission
Stores form responses as JSONB:
- `data` — `{ field_id: value, ... }`
- `source` — submitter IP
- `formId` — links to the Form

### ApiKey
Stores API key metadata (never the full key):
- `keyHash` — SHA-256 hash of the full key
- `keyPrefix` — first 12 chars for UI display
- `permissions` — JSON array of scopes
- `status` — "active" or "revoked"

To modify the schema, edit `prisma/schema.prisma` then run:

```bash
bun run db:push
# or: npx prisma db push
```

---

## REST API

All API routes require an API key via `Authorization: Bearer <key>` or `x-api-key: <key>` header.

Create an API key at **http://localhost:3000/api-keys**

### Endpoints

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | `/api/v1/forms` | `forms:read` | List published forms |
| POST | `/api/v1/forms` | `forms:write` | Create a form from flowchart |
| GET | `/api/v1/forms/{shareId}` | `forms:read` | Get form schema |
| GET | `/api/v1/forms/{shareId}/submissions` | `submissions:read` | List submissions |
| POST | `/api/v1/forms/{shareId}/submissions` | `submissions:write` | Submit a response |
| GET | `/api/v1/submissions` | `submissions:read` | List all submissions |

Create an API key at **https://reform-7jo8.onrender.com/api-keys**

Full interactive documentation at **https://reform-7jo8.onrender.com/docs/api**

---

## Testing

```bash
# List forms
curl http://localhost:3000/api/v1/forms \
  -H "Authorization: Bearer fep_live_your_key_here"

# Submit a form response
curl -X POST http://localhost:3000/api/v1/forms/{shareId}/submissions \
  -H "Authorization: Bearer fep_live_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"data": {"field_id": "value"}}'
```

Full interactive documentation at **http://localhost:3000/docs/api**

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5
- **Database**: PostgreSQL 16 + Prisma 6 ORM
- **Validation**: Zod (dynamic, config-driven)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **State**: Zustand (flowchart builder, walkthrough)
- **Visual Editor**: Custom canvas with SVG edges, drag-and-drop nodes
- **Containerization**: Docker + Docker Compose

---

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── api/v1/                 # Public REST API (API key auth)
│   ├── api/                    # Internal management API
│   ├── dashboard/              # Real-time dashboard
│   ├── forms/new/              # Flowchart builder
│   ├── templates/              # Starter + published templates
│   ├── submissions/            # Submission tracking
│   ├── api-keys/               # API key management
│   ├── settings/               # Settings + walkthrough
│   ├── docs/api/               # Interactive API docs
│   ├── f/[shareId]/            # Public form rendering
│   └── ...
├── components/
│   ├── flowchart/              # Builder components
│   ├── ui/                     # shadcn/ui primitives
│   └── ...
└── lib/
    ├── flowchart/              # Types, schema generator, validation engine
    ├── api-key-crypto.ts       # Key generation, hashing
    ├── api-auth.ts             # API key authentication middleware
    ├── walkthrough.ts          # 22-step guided tour
    └── db.ts                   # Prisma client
prisma/
└── schema.prisma               # Database models
```

---

## Design Decisions

### Why JSON columns instead of normalized tables?

Form structure changes at runtime. If fields were normalized into a `FormField` table, every form edit would require multi-row inserts/updates/deletes. By storing the flowchart as JSON, saving a form is one row write, loading is one query, and adding a new validation rule requires zero database migrations.

### Why Zod for validation?

Zod allows runtime schema construction (`z.string().min(rules.minLength).regex(...)`), which is exactly what dynamic validation requires. It's isomorphic (same code on client and server), provides TypeScript inference, and handles composable schemas for conditional visibility.

### Why separated `/api` and `/api/v1` routes?

`/api/*` is the internal management API (used by the app's own UI, no auth required). `/api/v1/*` is the public REST API (requires API keys, versioned for breaking changes). This separation allows changing the internal API freely while the public API stays stable.

---

## Trade-off Analysis

### Design Decisions

#### Database Schema Choice

**Decision**: PostgreSQL with JSONB columns for form configurations and submission data, accessed via Prisma ORM.

**Why not normalized tables?** A traditional approach would use `FormField`, `FieldOption`, `ValidationRule` tables with foreign keys to a `Form` parent. This creates an N+1 problem on every form load (one query for the form, one for fields, one for options, one for rules) and makes form editing a multi-row transaction. By storing the entire flowchart as a single JSONB document, form loading is a single `SELECT` and saving is a single `UPDATE` — atomic by definition.

**Why PostgreSQL over MongoDB?** PostgreSQL's JSONB type gives us document-style flexibility for form configs while keeping relational integrity for users, sessions, and API keys (which benefit from strict schemas, foreign keys, and indexes). We get the best of both worlds: relational for auth, document for forms.

**Why Prisma?** Type-safe queries, migration management, and a clean client API. The trade-off is a generated client that adds ~2MB to the bundle, but the developer experience and type safety outweigh this.

#### Routing Structure

**Decision**: Next.js App Router with three tiers of routes.

```
User-facing pages (/dashboard, /forms/new, /f/[shareId])
Internal API (/api/forms, /api/submissions, /api/auth/*)
Public REST API v1 (/api/v1/forms, /api/v1/submissions)
```

**Why this split?** The internal API is an implementation detail — it serves the app's own UI and can change freely. The public `/api/v1/` API is a contract with external integrators and must stay stable. Versioning in the URL (`/v1/`) lets us ship breaking changes as `/v2/` without disrupting existing integrations.

**Why Server Components for data-loading pages?** Pages like `/dashboard` and `/submissions` query the database directly via Prisma in async Server Components. This means zero client-side fetching on initial load — the HTML arrives with data already rendered. The trade-off is no client-side caching of initial data, but for a prototype this is acceptable (would add React Query for a production app).

#### Validation Strategy

**Decision**: Dynamic, config-driven validation using Zod — zero hardcoded rules in route handlers.

**How it works**: Each form's `schema` column contains a JSON document with field definitions and validation rules. At runtime, `buildFieldSchema()` reads the field type and rules, constructs the appropriate Zod type (e.g., `z.string().min(3).regex(/^[A-Z]+$/)`), and `buildFormSchema()` assembles them into a `z.object()`. The same function runs on both client (instant feedback) and server (security).

**Why not JSON Schema?** JSON Schema is a spec, not a runtime validator. We'd need a separate library (like `ajv`) to evaluate it. Zod is both the schema definition and the validator, with better TypeScript integration. The trade-off is Zod schemas are code, not data — but since we construct them programmatically from the JSON config, we get the best of both.

### Implementation Details

#### Error Handling

All database operations are wrapped in `try/catch` blocks with graceful fallbacks:

- **Dashboard**: If the database is unreachable, the page renders with empty states ("No forms yet", zero counts) instead of crashing
- **API routes**: Return structured error responses with HTTP status codes (400 for bad input, 401 for unauthorized, 403 for insufficient permissions, 422 for validation failures, 500 for server errors)
- **Validation**: Returns field-level errors keyed by field ID (`{ "field_id": "Invalid email format" }`) so the frontend can display them inline under each input
- **Public form renderer**: Shows loading state during submit, error state on failure, success state on completion — all with clear user-facing messaging

#### Data Consistency — Historical Integrity of Submissions

**The problem**: If a form's configuration changes after submissions have been stored, how do we ensure old submissions stay valid against the configuration version that produced them?

**Current approach**: Submissions store only the response `data` (keyed by field ID), not a snapshot of the form config. This means:

1. **Reading old submissions always works** — the `data` JSON is self-contained; it doesn't depend on the form's current schema
2. **Display is decoupled** — the submissions table shows raw JSON data, so even if fields are renamed or deleted from the form, old submissions display correctly
3. **Validation is point-in-time** — when a submission is created, it's validated against the form's schema *at that moment*. The `Form.schema` column is a snapshot of the generated schema at publish time, so even if the flowchart is edited afterward, the published schema doesn't change until the form is re-published

**What's NOT handled (production gap)**: If a form is re-published with different fields, old submissions can't be re-validated against the new schema (field IDs may not match). In production, we would:

1. Store a `schemaVersion` on each `Form` and `Submission`
2. Snapshot the full schema JSON into each `Submission` at creation time
3. Use the submission's own schema snapshot for any re-validation or display
4. Support schema migrations (field renaming, type changes) with explicit migration scripts

#### Data Consistency — Form Publishing

When a form is published:
1. The flowchart is validated (must have Start, at least one Field, and Submit nodes)
2. The schema is generated from the flowchart via `generateSchema()`
3. Both `flowchart` and `schema` are written to the `Form` row in a single Prisma `create()` call — atomic by definition
4. The `shareId` is generated by Prisma's `@default(cuid())` — guaranteed unique

This means a form is never in a half-published state: either the full flowchart + schema are persisted, or nothing is.

### Trade-offs

#### Within This Exercise

| Decision | Trade-off | Why It's Acceptable |
|----------|-----------|---------------------|
| **PostgreSQL for both local dev and production** | Heavier local setup than SQLite (needs a running Postgres instance) | One consistent database across all environments; can test JSONB indexing, GIN indexes, and Postgres-specific queries locally; Docker Compose makes local Postgres a one-command start |
| **SHA-256 for passwords** (not bcrypt/argon2) | Fast hashing = vulnerable to offline brute-force if DB leaks | 256-bit random salt + high-entropy passwords mitigate this; would use bcrypt in production |
| **No schema versioning on submissions** | Old submissions can't be re-validated after form changes | Submissions store raw data that's always readable; re-validation is not needed for display |
| **Zustand for builder state** (not Redux) | No devtools middleware, no time-travel debugging | The builder is a single-page tool; local state is sufficient; Redux would add overhead |
| **Custom SVG edges** (not React Flow) | No built-in features (edge routing, minimap, node grouping) | Full control over rendering, smaller bundle, no external dependency |
| **No background jobs** | Form publishing is synchronous | Publishing is fast (<100ms); no need for queue infrastructure |
| **No rate limiting** | API is vulnerable to abuse | Prototype scope; would add Redis-based rate limiting in production |
| **Ephemeral filesystem on Render free tier** | Container filesystem is reset on deploy/sleep | All persistent data lives in the managed PostgreSQL database; no state is stored on disk |

#### Scaling to Production

To take this engine from prototype to production-ready cloud environment:

**Database**:
- Add GIN indexes on JSONB columns for efficient querying inside form configs
- Implement connection pooling (PgBouncer or Prisma's built-in pool)
- Set up read replicas for submission queries (reads >> writes)

**Validation**:
- Cache compiled Zod schemas per form version (avoid rebuilding on every request)
- Add schema versioning: store `schemaVersion` on `Form` and `Submission`, snapshot the full schema into each submission at creation time
- Support schema migrations (field renaming, type changes) with explicit migration scripts

**API**:
- Add Redis-based rate limiting (per API key and per IP)
- Implement webhook delivery on new submissions (async, with retry)
- Add pagination cursors (currently using offset/limit)
- Add ETags for caching form configs (they change rarely)

**Authentication**:
- Switch from SHA-256 to bcrypt/argon2 for password hashing
- Add per-browser guest accounts (currently a single shared guest identity)
- Implement refresh tokens for long-lived sessions
- Add CSRF protection on all mutation endpoints

**Infrastructure**:
- Move to containerized deployment (Docker + Kubernetes or ECS)
- Add horizontal autoscaling (stateless Next.js servers behind a load balancer)
- Use a CDN for static assets and form rendering (forms are public, cacheable)
- Add observability: structured logging, error tracking (Sentry), metrics (Prometheus)
- Set up CI/CD pipeline with automated test runs on every PR

**Data Integrity**:
- Add database-level constraints (CHECK constraints on JSONB structure)
- Implement soft deletes for forms (don't hard-delete, mark as archived)
- Add audit logging for API key operations (creation, rotation, revocation)
- Implement backup strategy (daily snapshots + point-in-time recovery)

---

## AI Tool Transparency

This section documents which AI tools were used during development, how they were used, and what was manually verified — in the interest of full transparency.

### Tools Used

1. **Claude (Anthropic, latest model)** — Primary AI assistant for the entire development process
2. **Agent Browser** — Browser automation for end-to-end testing and visual verification
3. **Google Stitch** — Design tool used for the application's visual design and UI aesthetics

### How They Were Used

| Task | Tool | How |
|------|------|-----|
| **Scaffolding** | Claude | Generated initial Next.js project structure, Prisma schema, API route handlers, and component boilerplate. The AI provided the architectural skeleton; file organization and naming were reviewed and adjusted. |
| **Code Generation** | Claude | Wrote the validation engine (`validation-engine.ts`), API key crypto (`api-key-crypto.ts`), auth library (`auth.ts`), flowchart builder components, store, types, and all API routes. Each file was reviewed for correctness before committing. |
| **Writing Tests** | Claude | Generated the 152-test suite (unit, integration, e2e). The AI identified edge cases (conditional visibility operators, date boundaries, checkbox min/max) and wrote tests that caught 2 real bugs (missing `<`/`>` operators in `isFieldVisible`, date `maxDate` boundary handling). |
| **Debugging** | Claude + Agent Browser | Used Agent Browser to reproduce user-reported issues (blank preview, hydration errors, redirect loops). Fixes were applied manually after root-cause analysis. |
| **Writing Docs** | Claude | Generated all 30 Docusaurus documentation pages, the Docusaurus config, sidebars, and custom CSS. Content was reviewed for accuracy against the actual codebase. |
| **Reviewing Code** | Claude | The AI reviewed its own generated code for type safety, error handling, and security (e.g., ensuring `try/catch` around all database queries, `timingSafeEqual` for password verification, `httpOnly` cookies for sessions). |
| **Design** | Google Stitch | Used for the application's visual design — stone palette, amber accents, typography, card layouts, and overall UI aesthetics applied across the landing page and global theme. |

### What Was Verified Manually

Every part of the submission was verified through one or more of:

1. **Linting** — `bun run lint` passes with 0 errors (pre-existing warnings in shadcn/ui components only)
2. **Tests** — 152 tests pass covering validation, crypto, auth, schema generation, connection logic, all 6 templates, and full form lifecycle
3. **Browser Testing** — Agent Browser was used to verify every page loads (HTTP 200), forms submit correctly, validation errors display inline, the flowchart builder connects nodes properly, and the dashboard shows real database data
4. **API Testing** — All REST endpoints tested via curl (register, login, create API key, create form, submit response, list submissions, rotate key, revoke key)
5. **Database Verification** — Queried PostgreSQL directly to confirm data persistence (forms, submissions, API keys, users, sessions)
6. **Deployment** — Deployed to Render with PostgreSQL; verified the live app at https://reform-7jo8.onrender.com
7. **Documentation Deployment** — Built and deployed Docusaurus site to GitHub Pages at https://chama18.github.io/reform/

### Understanding the Codebase

I understand and can explain every part of what is submitted:

- **Validation Engine**: Reads `ValidationRules` from form config, builds Zod schemas per field type, assembles them into a `z.object()` (skipping hidden fields via `isFieldVisible`), and runs `safeParse()` — returning field-level errors keyed by field ID. Runs identically on client and server.
- **API Key System**: Keys are 256-bit random (`crypto.randomBytes(32)`), formatted as `fep_live_<hex>`. Only the SHA-256 hash is stored. Rotation overwrites the hash (old key stops working immediately). Permissions are hierarchical (write implies read).
- **Authentication**: Passwords hashed with SHA-256 + per-user 16-byte salt. Verification uses `timingSafeEqual` to prevent timing attacks. Sessions are 256-bit tokens in httpOnly cookies, 30-day expiry, stored in a `Session` table.
- **Flowchart Builder**: Zustand store manages nodes/edges/selection. Canvas uses CSS transforms for pan/zoom. Edges are SVG bezier curves calculated from node positions. Connection handles validate node type compatibility (start can't receive, end can't send).
- **Database**: Prisma ORM with PostgreSQL. Form configurations stored as `Json` columns (JSONB in PostgreSQL) for atomic updates and single-query loading. The same PostgreSQL instance is used in local dev, Docker, and production so schema and query behavior are identical across environments.

---

## License

MIT
