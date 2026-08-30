# Reform — Demo Video Script (90 seconds)

For the Xano Hackathon "Rebuild a SaaS Tool You Hate" submission.

**Total time:** 90 seconds
**Setup:** One browser window, signed into Reform. One terminal showing the Xano workspace in another tab.

---

## [0:00 — 0:05] Title card

> **"Reform — the AI-native form builder that replaces Typeform + Zapier + Airtable + Metabase + Customer.io + Hotjar + Localize. Built on Xano. $99/mo instead of $485/mo."**
>
> *Show the $485 → $99 number on screen.*

---

## [0:05 — 0:15] AI Form Generator (Tier 1 #1)

> **"Type a prompt, get a form."**

- Navigate to `/forms/ai`
- Click "NPS Survey" example chip (auto-fills prompt)
- Click "Generate form"
- **Watch the spinner** — `13.8s` round-trip, model is `glm-4.5`
- Result shows: 5 nodes (start, 3 fields, submit), 4 edges, suggested name + description
- Click "Open in builder" → flowchart loads in the visual editor

---

## [0:15 — 0:25] Smart Field Suggestions (Tier 1 #3)

> **"AI suggests the right field type and validation — automatically."**

- In the builder, click a "Country" field node
- In the inspector, click "Suggest config"
- AI returns: `dropdown` type, 10 realistic country options, validation, rationale
- Click "Apply" → field type upgrades from text to dropdown

---

## [0:25 — 0:40] Conversational Form Mode (Tier 2 #4) ⭐ wow moment

> **"The same form, but as a chat. AI walks you through each question."**

- Open a new tab to `/f/{shareId}/chat`
- Bot greets: "What's your Name?"
- Type "Alice Johnson"
- Bot: "What's your Email Address?"
- Type "alice@acme.com"
- After last question, bot: "Thanks! I have everything I need. Submitting your responses now…"
- Success banner with submission ID

---

## [0:40 — 0:50] Voice-First Mode (Tier 3 #7)

> **"Or speak your answer — Reform transcribes it with AI."**

- Click the 🎤 mic button on the chat input
- Recording indicator pulses red
- Click again to stop → "Transcribing your voice…"
- Transcribed text appears in the input

---

## [0:50 — 1:00] AI Submission Insights (Tier 1 #2)

> **"Get a 30-second summary of 200 submissions."**

- Navigate to `/forms/{id}/insights`
- After 6 seconds: 3 bullets, sentiment breakdown (40/20/40 pos/neu/neg), 4 topic clusters, 2 standout verbatim quotes
- Show "cached" badge — second visit returns instantly

---

## [1:00 — 1:10] AI Smart Routing (Tier 2 #5)

> **"Write routing rules in plain English. AI evaluates every submission."**

- Navigate to `/forms/{id}/routing`
- Show existing rule: "If the feedback mentions billing → email finance@acme.com"
- Submit a billing-related response → rule fires (fire_count goes to 1)
- Submit a positive response → rule does NOT fire (fire_count stays at 1)

---

## [1:10 — 1:18] Auto-Translation (Tier 2 #6) + PDF Reports (Tier 3 #9)

> **"One-click translate to 10 languages. PDF reports with AI analyst notes."**

- Click "Translate to Spanish" → "Start" → "Comenzar", "Name" → "Nombre", "Submit" → "Enviar"
- Click "Download PDF" for a submission → branded PDF with AI "Analyst notes" section

---

## [1:18 — 1:30] The Xano backend ⭐ hackathon requirement

> **"Every AI call flows through Xano."**

- Switch to terminal showing Xano Studio
- Show the `ai_generation_log` table — **every AI invocation logged** with prompt, model, tokens, latency, status
- Show the 3 XanoScript function stacks: `ai/validate_and_log_form`, `ai/save_form_insight`, `ai/log_field_suggestion`
- Show the 11 tables: user, post, form, submission, api_key, session, ai_generation_log, form_insight, form_translation, form_routing_rule, field_event, conversation
- **"11 tables, 3 function stacks, 1 backend. Xano is Reform's brain — not just its database."**

---

## [1:30 — 1:35] Closing

> **"Reform — 7 tools, 1 AI-native platform, $99/mo. Built on Xano."**
>
> *Show logo + URL on screen.*

---

## Tips for recording

- **Use Loom** (free, browser-based, 5-min limit fine for 90s)
- **Show your face** in the corner — judges like seeing the builder
- **Speed up waiting time** — during the 13.8s AI form generation, cut to a fast-forward or show the audit log appearing live in Xano Studio
- **Have everything pre-loaded** — sign in, open the form, have a submission ready before you start recording
- **End with a still frame** showing the URL + your email for 3 seconds so judges can write it down
