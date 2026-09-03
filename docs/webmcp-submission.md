# WebMCP Challenge submission — Reform Agent Workspace

**Live URL:** https://reform-webmcp.vercel.app (replace once deployed)
**Full product:** https://reform-pearl.vercel.app · **Repo:** github.com/CHAMA18/reform (`webmcp-demo/`)
**Demo video:** <YouTube URL — record per script below>

---

## 1. Why this use case is a strong fit for WebMCP

Forms are a negotiation between intent and structure: what you *want to ask* becomes
fields, options, and validation rules, and the answers become decisions. That loop is
exactly where an agent is useful and where clicking around a UI is slow. Reform exposes
its workspace as structured tools (`create_form_spec`, `preview_form`,
`add_sample_response`, `get_workspace_state`), so an agent operates on the product's real
objects — form specs with the same field vocabulary and validation model the product
uses — instead of scraping pixels. The page stops being a thing an agent reads and
becomes a workspace an agent works in.

## 2. How it creates a better user experience

Today, building a good form means a blank page and a long to-do list: draft questions,
pick types, set validation, then wait days for real answers to learn anything. With
Reform's workspace, one sentence from the user ("an NPS survey with a rating and a
comment") becomes a validated spec instantly; the human refines it in a live preview
while the agent, on request, generates sample typed/voice responses to reveal the
signal — average scores, channel mix, and weak questions — before the form ever ships.
The human stays in control; the agent does the construction and the reading. The
bottleneck changes from *writing the form* to *deciding what to ask*.

## 3. What people and agents can do together that was hard or impossible before

- **Design together in real time:** the agent drafts a form from natural language and the
  human watches it render in the same panel — no exporting JSON between tools, no
  screenshots, no "here's a spec, go build it" hand-offs.
- **See signal before launch:** the agent generates realistic submissions across answer
  channels and the page summarizes them — teams can sanity-check a form's questions
  before spending days collecting real responses.
- **Grounded answers:** agents answer questions from `get_workspace_state` — actual
  specs, actual responses, actual activity — not guesses about what the page might do.

## 4. How we implemented WebMCP

A single static page (`webmcp-demo/index.html`, zero build) that feature-detects
`document.modelContext` and registers four tools with the WebMCP Imperative API —
`name`, `description`, JSON-schema `inputSchema`, and an async `execute` that calls the
same functions the human UI uses. Execution is wrapped to append to a shared activity
log so both parties see every call. Registration is guarded (`'modelContext' in
document`); without WebMCP the page stays fully usable — each tool card runs the exact
same function an agent would call, which doubles as a human-parity test of the tool
surface. Deployed as a static site on Vercel.

---

## Demo video script (<3 min, with audio)

Opening: title card — "Reform Agent Workspace · people and agents build forms together".

1. **(~0:15)** What Reform is, one line: plain language → validated dynamic form →
   every response becomes signal. Show the full product URL briefly.
2. **(~0:20)** The problem: building a good form is a blank page and a checklist; you
   learn nothing until real answers arrive.
3. **(~1:10)** The demo (ChatGPT in-app browser, split-screen if possible):
   - Say: *"Design a support ticket intake form"* — the agent calls `create_form_spec`;
     the spec appears in the workspace.
   - Say: *"Preview it and add two sample responses — one voice"* — watch the preview
     render and the responses land in the feed.
   - Say: *"What does the workspace show so far?"* — agent calls `get_workspace_state`
     and summarizes grounded in real state.
   - Human refines (rename a field / add priority) — together they iterate.
4. **(~0:20)** What was hard before: no exports, no hand-offs, no waiting for real data —
   the agent constructs, the human decides.
5. **(~0:15)** Close: URL + tools list + "the full product is live at
   reform-pearl.vercel.app". Record at 1080p, voiceover or live audio, under 3:00 total.

---

## Pre-submission checklist

- [ ] Deploy: `cd webmcp-demo && npx vercel deploy --prod` (project name `reform-webmcp`)
- [ ] Confirm header chip reads "WebMCP active — 4 tool(s) registered" in Chrome with `#enable-webmcp-testing`
- [ ] Test once in ChatGPT's in-app browser with the exact agent prompts above
- [ ] Upload <3-min YouTube video (public, audio), paste URL here
- [ ] Repo: add an open-source LICENSE (e.g. MIT) + set it visible in GitHub repo About
- [ ] Confirm repo is public
