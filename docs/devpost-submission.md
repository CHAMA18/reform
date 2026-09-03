# Reform — Devpost / Xano Hackathon 2026 Submission

## Inspiration

Most forms are treated like documents: a box to fill in, a button to press, and a spreadsheet nobody wants to read. But a form is really the first conversation between a team and the people it serves — and most tools end that conversation the second it starts. The form gets built in one tool, its logic lives in another, and the answers die in a third.

We wanted the form to be the beginning of a workflow, not the end of a page: one place where an idea becomes a validated structure, that structure meets people however they prefer to answer, and every response turns into signal the team can act on.

## What it does

Reform turns a plain-language idea into a secure, adaptive form — no code.

- **Describe it, get a form.** The AI generator turns a sentence like "an NPS survey with a rating and comments" into a real structure: fields, options, validation, and a publishable flow.
- **See the logic, not just the UI.** A visual flowchart builder (5 node types, 13 field types, conditional branches) makes every decision explicit and editable — the same form config drives validation on the client *and* the server via a single Zod-powered engine.
- **One flow, three journeys.** Respondents can answer by typing, in a natural AI conversation, or with their voice (local Whisper transcription, 99 languages). Translation is one click and auto-detects the visitor's language.
- **Every response becomes signal.** Submissions stream into a real-time dashboard; per-field event analytics (focus, abandon, drop-off) get an AI read with concrete fixes; plain-English routing rules fire email, webhook, or Slack actions.
- **Built for developers too.** Scoped, rotatable API keys (SHA-256 at rest) with a clean REST API — the whole workflow is programmable.

Every piece of state — form schemas, flows, translations, routing rules, submissions, field events — lives in Xano, so it's one system end to end.

## How we built it

- **Product:** Next.js + TypeScript + Tailwind, with Xano as the backend and PostgreSQL underneath. A flowchart engine renders and edits the visual flow; a Zod schema compiled from the form config validates identically in the browser and on the server. Field events are captured per interaction and aggregated in Xano for the AI drop-off analysis.
- **Voice:** a local Whisper transcription server keeps audio on the respondent's machine while the AI extracts structured answers from free-form speech.
- **The film:** we produced a 3-minute cinematic demo of the real product — actual screens captured in a live browser, then cut so every scene switch lands exactly on the narration. Narration was generated with ElevenLabs and re-aligned word-by-word; the measured audio boundaries drive the visuals in two independent render pipelines (Remotion and an HTML/Puppeteer engine) that stay in sync.

## Challenges we ran into

- **One schema, many surfaces.** The same form must render as a typed page, a conversation, and a voice interaction with identical validation and submission behavior. Getting the flow graph, the generated schema, and every experience to agree took several iterations.
- **Voice that feels natural.** Transcription alone isn't enough — the AI has to know which spoken sentence answers which field, and the whole thing has to feel hands-free, not like dictation.
- **Keeping the film honest.** The demo shows the real product, so the visuals had to be pixel-faithful and the narration had to match the runtime exactly. We regenerated the voiceover, measured every word's timestamp, and re-derived all 13 scene boundaries from audio — including an imperceptible tempo correction to land precisely on 3:00 without breaking sync.

## Accomplishments that we're proud of

- A **working product**, not a mockup — you can build, publish, and answer a real form end to end, and the demo film is footage of that real product.
- **Three journeys from one flow**: typed, conversational, and voice experiences sharing one schema, validation, and submission pipeline.
- **AI that's native, not bolted on**: prompt-to-form generation, drop-off analysis that names the problem and suggests the fix, and routing rules written in plain English.
- The film itself: real logos, real screens, and visuals locked to the narration to the millisecond.

## What we learned

- The quality of a form is the quality of the first conversation a team has with the people it serves — meet people where they are (voice, chat, their language) and the signal gets better.
- Measured beats guessed: once we derived scene cuts from word-level audio alignment, the video and the voice finally felt like one thing.
- Keeping validation and state in one engine (and one backend) is what makes "one platform" a real claim instead of a slogan.

## What's next for Reform

- A template library and team collaboration inside the flowchart builder.
- Routing and follow-up questions that learn from past submissions.
- Deeper voice: multilingual conversation, offline mode, and a mobile experience.
- Plugging responses into the tools teams already live in — Slack, CRM, webhooks everywhere.
- Turning analytics into action: when the AI spots a drop-off, Reform proposes and applies the fix.
