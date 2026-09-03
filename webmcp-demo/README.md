# Reform · Agent Workspace — WebMCP demo

A self-contained WebMCP demo for **Reform** (dynamic forms that turn responses into
signal). The page exposes the form-design workflow as registered `document.modelContext`
tools, so an AI agent in **ChatGPT's in-app browser** (or Chrome with WebMCP enabled) can
do real work on the page — draft a form spec, preview it live, generate sample responses,
and answer questions grounded in the workspace state — while a human watches and steers
in the same UI. **No build step, no server, no secrets.** Static HTML + JS only.

The full product lives at [https://reform-pearl.vercel.app](https://reform-pearl.vercel.app)
(Next.js, backend: Xano).

## Tools registered via WebMCP

| Tool | What an agent can do |
|---|---|
| `create_form_spec` | Design a form from plain language → validated spec (title, fields, types, options, validation) using the product's field vocabulary (9+ types incl. rating, dropdown, date, file). |
| `preview_form` | Render a spec live in the preview panel — the human sees the agent's work appear. |
| `add_sample_response` | Generate a sample submission (typed / chat / voice) so responses visibly become signal (averages, channel mix). |
| `get_workspace_state` | Return JSON of specs, responses, and activity — grounds agent answers in what actually happened. |

Registration uses the WebMCP Imperative API:

```js
await document.modelContext.registerTool({
  name: 'create_form_spec',
  description: '…',
  inputSchema: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] },
  execute: async (input) => '…',
});
```

Feature-detected (`document.modelContext`); without it the page degrades gracefully and
every tool still runs from its card (the exact same function an agent calls).

## Deploy (one folder → one Vercel project)

```bash
cd webmcp-demo
npx vercel login          # browser auth once
npx vercel deploy --prod  # static auto-detected
```

On first deploy Vercel asks for a project name — use **`reform-webmcp`** so the live URL
is `https://reform-webmcp.vercel.app`. No framework settings needed (pure static).

## Test

- **Chrome:** open the live URL with `chrome://flags/#enable-webmcp-testing` enabled →
  the header chip should read *"WebMCP active — 4 tool(s) registered"*.
- **ChatGPT:** open the live URL in ChatGPT's in-app browser, then ask it to *"design a
  support ticket intake form, preview it, and add a sample response"* — it will call the
  registered tools and the human UI updates live.
- **No agent available:** every tool card runs the identical function — use the page
  yourself.

## Files

```
index.html         the whole demo (markup + styles + tool engine + WebMCP registration)
assets/reform-mark.png
README.md
```

Workflow example an agent/human can run: *create a "job application" form → preview it →
add three voice/chat responses → ask the workspace for the read → iterate on the spec.*
