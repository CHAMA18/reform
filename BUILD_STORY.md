# Reform — Build Story

## Project Name

**Reform** — *One AI-native platform to replace 7 SaaS tools you hate.*

## What software did you replace?

Reform replaces a constellation of disconnected SaaS tools that businesses cobble together to manage forms, collect submissions, and act on data:

| Tool | Monthly Cost | Reform's AI Replacement |
|------|-------------|------------------------|
| Typeform / JotForm | $25-50/mo | AI Form Generator — describe what you need in plain English, get a live form in seconds |
| Google Forms + Sheets | $0 (but friction) | Submissions dashboard with real-time sync to Xano |
| Intercom / Drift chat | $74/mo | Conversational Forms — AI-powered chat interface that guides respondents through forms |
| Otter.ai / Rev.com | $16-20/mo | Voice Mode — local Whisper transcription, speech-to-form input |
| Lokalise / Phrase | $120/mo | Auto-Translation — translate forms into 10+ languages instantly with AI |
| Zapier / Make | $20-50/mo | Smart Routing — AI evaluates submissions and routes them to the right team |
| Hotjar / FullStory | $39/mo | Drop-off Analytics — identify where respondents abandon forms |

**Total replaced:** ~$344/mo → **Reform: $0-99/mo**

## Why did you choose this?

Every business relies on forms — employee onboarding, customer feedback, event registration, support tickets, job applications. But the tools we use to build and manage them are stuck in 2015. You still drag-and-drop fields manually, copy-paste translations, set up routing rules with if/else logic, and export CSVs to figure out what happened.

We asked: *What if AI could handle all of that?* Not just "AI-assisted" features bolted onto an old UI, but a platform where AI is the primary interface. You describe a form, AI builds it. A submission arrives, AI routes it. A form needs to go global, AI translates it. That's Reform.

## Which AI tools did you use?

- **Claude Code (Codebuff)** — Primary development agent. Built 95% of the codebase through conversational coding sessions. Used for architecture decisions, component design, API implementation, and bug fixes.
- **OpenAI gpt-4o-mini** — The AI engine powering all 10 features at runtime. Form generation, insights, routing evaluation, translation, field suggestions, and conversational form logic.
- **Ollama (local LLM)** — Explored as an on-device alternative for privacy-sensitive deployments. Connected a local 7B model for form generation (fallback path).
- **Whisper (local)** — Speech-to-text for Voice Mode. Runs locally via Docker for zero-latency transcription.

## How long did it take to build?

**~18 hours total**, broken down as:

| Phase | Time | What happened |
|-------|------|---------------|
| Architecture + Xano setup | 2h | 12 tables, 6 function stacks, REST API, auth flow |
| Core form builder | 4h | Flowchart editor, schema generator, validation engine |
| AI integration | 3h | OpenAI client, form generation, insights, routing |
| 10 AI feature pages | 4h | Conversational, voice, translation, routing, analytics, PDF |
| Sidebar + dashboard redesign | 2h | World-class navigation, amber theming, responsive layout |
| Forms CRUD + subscription | 1.5h | Management page, status toggling, plan comparison |
| Testing + debugging | 1.5h | 14-point CRUD test suite, type checking, edge cases |

## What would have taken significantly longer without AI + Xano?

**Without Claude Code:**
- The 10 AI feature pages alone would have taken 2-3 days of manual coding. Claude Code built each page in 10-15 minutes with consistent design language.
- The sidebar redesign (400+ lines of component logic, tooltips, collapsed state, category grouping) would have been a full day of CSS/React work.
- The Xano audit trail integration (writing to Xano's Metadata API directly) required understanding Xano's REST API format — Claude Code handled the snake_case ↔ camelCase mapping, auth tokens, and error handling.

**Without Xano:**
- Setting up 12 database tables, REST API endpoints, auth middleware, and file storage would have taken 2-3 days of backend work. Xano did it in minutes.
- The audit trail (22+ AI generation log entries with prompt, model, tokens, latency, status) would require a separate logging service. Xano's built-in table gave us this for free.
- Xano's static hosting means we can deploy the frontend without a separate hosting provider.

**The biggest time savings:** Building a production-quality CRUD interface (create, read, update, delete, duplicate, status toggle) with 14 passing end-to-end tests would typically be a 2-day project. With AI + Xano, it was done in under 2 hours.

## Architecture

```
┌─────────────────────────────────────────────┐
│                 FRONTEND                     │
│  Next.js 16 + React + Tailwind CSS          │
│  15 pages, 20+ components, dark theme       │
├─────────────────────────────────────────────┤
│                 AI ENGINE                     │
│  OpenAI gpt-4o-mini (cloud)                 │
│  Ollama (local fallback)                    │
│  Whisper (voice transcription)              │
├─────────────────────────────────────────────┤
│              XANO BACKEND                    │
│  12 tables • 6 function stacks              │
│  Metadata API • Auth • Audit trail          │
│  Static hosting for frontend                │
└─────────────────────────────────────────────┘
```

## The 10 AI Features

1. **AI Form Generator** — Describe a form in English → get a live, shareable form in 5 seconds
2. **Conversational Forms** — AI chat interface that asks questions one at a time
3. **Voice Mode** — Speak your answers, Whisper transcribes, AI extracts form fields
4. **Auto-Translation** — Translate any form into 10+ languages instantly
5. **Smart Routing** — AI evaluates submissions and routes to the right team/channel
6. **Drop-off Analytics** — Identify where respondents abandon your forms
7. **AI Insights** — AI-powered analysis of submission patterns and trends
8. **Field Suggestions** — AI recommends fields you might be missing
9. **PDF Reports** — Generate professional reports from submission data
10. **Smart Validation** — AI-powered field validation with contextual error messages
