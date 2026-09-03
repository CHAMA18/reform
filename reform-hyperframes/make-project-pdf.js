/* make-project-pdf.js — comprehensive Reform project overview from start to finish.
 * Run: node make-project-pdf.js [output.pdf]   (default: ../Reform-Project-Overview.pdf)
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const outFile = path.resolve(__dirname, process.argv[2] || '../Reform-Project-Overview.pdf');
const defaultChrome = path.join(process.env.HOME || '', '.cache/puppeteer/chrome-headless-shell/mac_arm-152.0.7977.54/chrome-headless-shell-mac-arm64/chrome-headless-shell');

const h = (n, kicker, title, body) => `
  <section class="pg">
    <div class="kicker"><span class="num">${n}</span>${kicker}</div>
    ${title ? `<h2>${title}</h2>` : ''}
    ${body}
  </section>`;

const table = (rows, head) => `
  <table><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
  <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

const code = (t) => `<pre class="code">${t}</pre>`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 100%; background: #0c0a09; color: #f5f5f4; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
  .page { max-width: 860px; margin: 0 auto; padding: 54px 58px 40px; }
  h2 { font: 700 27px/1.15 'Space Grotesk', sans-serif; letter-spacing: -.02em; margin: 6px 0 14px; }
  p { font-size: 14.5px; line-height: 1.68; color: #e7e5e4; margin-bottom: 9px; }
  .kicker { display: inline-flex; align-items: center; gap: 9px; color: #f59e0b; font: 700 11px 'DM Sans'; letter-spacing: .2em; text-transform: uppercase; margin-bottom: 10px; }
  .num { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; background: rgba(245,158,11,.14); border: 1px solid rgba(245,158,11,.45); font-size: 11px; }
  ul, ol { margin: 0 0 12px 2px; padding-left: 0; list-style: none; }
  li { position: relative; padding-left: 20px; font-size: 14.5px; line-height: 1.6; color: #e7e5e4; margin-bottom: 6px; }
  ul li::before { content: ''; position: absolute; left: 2px; top: 9px; width: 7px; height: 7px; border-radius: 2px; background: linear-gradient(135deg,#f59e0b,#d87900); }
  ol { counter-reset: item; }
  ol li { counter-increment: item; padding-left: 26px; }
  ol li::before { content: counter(item); position: absolute; left: 0; top: 1px; width: 18px; height: 18px; border-radius: 6px; display: grid; place-items: center; font: 700 10px 'JetBrains Mono'; color: #0c0a09; background: linear-gradient(135deg,#f59e0b,#d87900); }
  b, strong { color: #f5f5f4; }
  em { color: #f59e0b; font-style: normal; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }
  th { text-align: left; font: 700 10px 'DM Sans'; letter-spacing: .14em; text-transform: uppercase; color: #a8a29e; padding: 7px 10px; border-bottom: 1px solid rgba(245,158,11,.4); }
  td { padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,.06); font-size: 13px; line-height: 1.5; color: #e7e5e4; vertical-align: top; }
  td.m { font: 600 13px 'Space Grotesk'; color: #f5f5f4; white-space: nowrap; }
  .code { font: 500 11.5px/1.65 'JetBrains Mono', monospace; background: #131110; border: 1px solid #292524; border-radius: 10px; padding: 13px 16px; margin: 8px 0 16px; color: #d6d3d1; white-space: pre-wrap; }
  .code .c { color: #78716c; }
  .tag { display: inline-block; border: 1px solid rgba(245,158,11,.45); color: #f59e0b; border-radius: 999px; padding: 2px 9px; font: 700 9.5px 'DM Sans'; letter-spacing: .1em; text-transform: uppercase; margin-right: 5px; }
  .pill { display: inline-block; background: rgba(255,255,255,.06); border-radius: 999px; padding: 3px 10px; font-size: 12px; color: #d6d3d1; margin: 0 4px 6px 0; }
  section.pg { page-break-before: always; }
  section.pg:first-of-type { page-break-before: auto; }
  .lead { font-size: 16px; color: #d6d3d1; }
  .rule { border: none; border-top: 1px solid rgba(255,255,255,.1); margin: 22px 0; }
  footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,.08); display: flex; justify-content: space-between; color: #78716c; font-size: 11px; }
  .muted { color: #a8a29e; }
  .small { font-size: 12.5px; color: #a8a29e; }
  .accent { color: #f59e0b; }
  .wrap { display: flex; gap: 10px; flex-wrap: wrap; margin: 10px 0 4px; }
</style></head><body>
<div class="page">

  <!-- COVER -->
  <div style="min-height: 88vh; display: flex; flex-direction: column; justify-content: center;">
    <div style="display:flex; align-items:center; gap:18px;">
      <div style="width:74px; height:74px; border-radius:20px; display:grid; place-items:center; background:linear-gradient(135deg,#ffc247,#d87900); color:#fff; font:800 38px 'Space Grotesk'; box-shadow:0 0 60px rgba(245,158,11,.5);">R</div>
      <div>
        <div style="font:700 40px/1 'Space Grotesk'; letter-spacing:-.03em;">Reform</div>
        <div style="color:#a8a29e; font-size:14px; letter-spacing:.24em; text-transform:uppercase; margin-top:6px;">The complete project story</div>
      </div>
    </div>
    <h1 style="font:700 54px/1.06 'Space Grotesk'; letter-spacing:-.035em; margin:46px 0 10px;">Forms that think dynamically.</h1>
    <p style="font-size:19px; line-height:1.6; color:#d6d3d1; max-width:640px;">From the original idea to the shipped platform and the demo films that tell its story — Reform in one document.</p>
    <div style="margin-top:34px;">
      <span class="tag">Xano Hackathon 2026</span><span class="tag">"Rebuild a SaaS Tool You Hate"</span><span class="tag">Powered by Xano</span>
    </div>
    <div class="muted" style="font-size:13px; margin-top:56px; line-height:1.9;">Reform · Dynamic Form Builder Engine · reform-7jo8.onrender.com<br><b style="color:#f59e0b;">Backend: Xano.</b> Every piece of state — form schemas, flows, submissions, translations, routing rules, field events — lives in Xano, and all AI logic runs as Xano function stacks.</div>
  </div>

  <!-- TOC -->
  <section class="pg">
    <div class="kicker"><span class="num">✦</span>Contents</div>
    <h2>What's inside</h2>
    ${table([
      ['01', 'The idea', 'A stack of seven tools that hated each other'],
      ['02', 'What Reform is', 'Tagline, elevator pitch, and the platform at a glance'],
      ['03', 'The product tour', 'Dashboard → builder → experiences → signal'],
      ['04', 'How it is built', 'Architecture, Xano backend, and the reasoning'],
      ['05', 'Ten AI features', 'The three tiers of native AI'],
      ['06', 'The journey', 'From FormEngine Pro to Reform — timeline'],
      ['07', 'The demo films', 'Three generations of video, one final 3:00 cut'],
      ['08', 'Brand & media', 'The mark, the palette, the assets'],
      ['09', 'Submission materials', 'Pitch, write-up, and the upload package'],
      ['10', "What's next", 'Roadmap for Reform'],
      ['Appendix', 'Quick reference', 'Commands, routes, and live URLs'],
    ], ['#', 'Section', 'What it covers'])}
  </section>

  ${h(1, 'The idea', 'A stack of seven tools that hated each other',
    `<p class="lead">Every business runs on forms — onboarding, feedback, event registration, support, applications. But the tools used to build them were stuck in 2015: drag fields manually, copy-paste translations, hand-write routing rules, and export CSVs to figure out what happened.</p>
    <p>The result is a constellation of disconnected SaaS tools, each solving one slice of the same workflow:</p>
    ${table([
      ['Typeform / JotForm', '$25–50/mo', 'AI Form Generator — describe a form in plain English'],
      ['Google Forms + Sheets', 'free, but friction', 'Submissions dashboard synced to the backend'],
      ['Intercom / Drift chat', '$74/mo', 'Conversational forms — AI guides respondents'],
      ['Otter.ai / Rev.com', '$16–20/mo', 'Voice mode — local Whisper transcription'],
      ['Lokalise / Phrase', '$120/mo', 'Auto-translation into 10+ languages'],
      ['Zapier / Make', '$20–50/mo', 'Smart routing — AI evaluates and routes submissions'],
      ['Hotjar / FullStory', '$39/mo', 'Drop-off analytics with AI-suggested fixes'],
    ], ['Tool being replaced', 'Cost', "Reform's replacement"])}

    <p><b>The pitch:</b> ~$485/mo of disconnected tools becomes one AI-native platform for $99/mo. Reform was built for the Xano Hackathon theme — <b>"Rebuild a SaaS Tool You Hate"</b> — asking the question: <em>what if AI were the primary interface</em>, not a bolted-on feature? You describe a form, AI builds it. A submission arrives, AI routes it. A form goes global, AI translates it.</p>`)}
  </section>

  ${h(2, 'What Reform is', 'One platform. Three journeys. Ten AI features.',
    `<div class="tagline-hero">Forms that think dynamically.</div>
    <p style="margin-top:14px;">Reform turns a plain-language idea into a secure, adaptive form — no code required. Describe what you want to ask, and Reform generates the structure and the logic. Publish one form your customers can answer by <b>typing, conversation, or voice</b>, in their own language. Every response lands in one dashboard you can act on — backed by a REST API from day one and <b>built end to end on Xano</b> as its backend.</p>
    <p><b>Xano is the backend used overall.</b> Form schemas, flows, submissions, translations, routing rules, and field events all live in Xano's tables; the AI that generates, routes, and analyses forms runs as Xano function stacks over that data — one backend for the whole product.</p>
    <div class="wrap">${['No code required', '13 field types', 'Dynamic validation', 'REST API included', 'PostgreSQL backed', '10 AI features'].map((x) => `<span class="pill">✓ ${x}</span>`).join('')}</div>
    <hr class="rule">
    <p><b>Elevator pitch (~15 seconds).</b> "Reform turns a plain-language idea into a secure, adaptive form — no code required. You describe what you want to ask, Reform generates the structure and the logic, and you publish one form your customers can answer by typing, conversation, or voice, in their own language. Every response lands in one dashboard you can act on — and it's backed by a REST API, with all of it running on Xano from day one."</p>
    <p><b>One flow, one schema.</b> The same visual flowchart drives the typed page, the chatbot, and the voice experience — identical validation, identical submission pipeline, all stored and processed in Xano. Reform is built so the team that designs the form sees the logic, the team that owns the workflow sees the response, and the people answering choose the experience that feels natural.</p>`)}
  </section>

  ${h(3, 'The product tour', 'From blank page to action in one workspace',
    `<p class="lead">A single dark workspace with amber accents. Everything hangs off a persistent sidebar: Dashboard, Templates, Generate, Flowchart Builder, Submissions, Analytics, Routing, API Keys.</p>
    ${table([
      ['Dashboard', '/dashboard', 'Live form counts, submission stats, and the form library in one command center'],
      ['Templates', '/templates', 'Six starter templates — KYC, feedback, event registration, support ticket, job application, contact'],
      ['AI Form Generator', '/forms/ai', 'Type a prompt → a complete validated flowchart in ~3 seconds'],
      ['Flowchart Builder', '/forms/new', 'Custom canvas: 5 node types, 13 field types, SVG edges, drag-and-drop, conditional branches'],
      ['Conversational mode', '/f/{id}/chat', 'A bot walks respondents through the questions and submits at the end'],
      ['Voice mode', '/f/{id}/voice', 'Mic button → local Whisper transcription → AI extracts the structured answer'],
      ['Translation', '/forms/[id]/translate', "One-click translate all strings; auto-detect the visitor's language"],
      ['Submissions', '/submissions', 'Searchable, expandable responses with JSON payload viewer'],
      ['Field analytics', '/forms/[id]/analytics', 'Per-field focus/blur/input/abandon events → AI drop-off report'],
      ['Smart routing', '/forms/[id]/routing', 'Plain-English rules ("if feedback mentions billing, email finance") evaluated per submission'],
      ['API keys', '/api-keys', 'Scoped keys, SHA-256 at rest, rotate/revoke instantly'],
      ['PDF reports', '/api/submissions/[id]/pdf', 'Branded per-submission PDF with AI-written analyst notes'],
      ['Embed SDK', '/sdk-demo', '&lt;ReformForm shareId="..." mode="standard|conversational|voice" /&gt; for any site'],
    ], ['Area', 'Route', 'What it does'])}
`)}
  </section>

  ${h(4, 'How it is built', 'One front end. One backend: Xano.',
    `<p class="lead">Reform's front end is Next.js + TypeScript. Everything underneath the UI — the data, the AI logic, the API, the background jobs, and the hosting — is <b>Xano</b>. Reform is built on Xano as its overall backend, not just as a database.</p>
    ${table([
      ['Front end', 'Next.js 16 (App Router, Turbopack) · TypeScript 5 · Tailwind CSS 4 · shadcn/ui'],
      ['Backend (overall)', 'Xano — data tables, XanoScript function stacks, REST API group, auth, scheduled tasks, static hosting'],
      ['Validation', 'Zod — rules stored in config, compiled at runtime, identical client + server'],
      ['Builder state / canvas', 'Zustand · custom SVG canvas (5 node types, 13 field types, conditional edges)'],
      ['AI at runtime', 'LLM calls orchestrated by Xano function stacks; OpenAI-compatible (local Ollama optional)'],
      ['Voice', 'Local Whisper ASR — answers extracted back into Xano submissions'],
    ], ['Layer', 'Choice'])}
    <p><b>What lives in Xano:</b></p>
    <ul>
      <li><b>Data.</b> 12 tables — user, post, form, submission, api_key, session, ai_generation_log, form_insight, form_translation, form_routing_rule, field_event, conversation — modelled through Prisma on Xano's PostgreSQL.</li>
      <li><b>Business logic.</b> 6 XanoScript function stacks: orchestrated form generation, validation + audit logging, cached insights orchestration, field-suggestion logging, and routing-rule evaluation — the AI that powers all 10 features runs here.</li>
      <li><b>The API.</b> One Xano API group (<b>/api:reform/</b>) exposes forms, submissions, the AI audit log, and health; the app's public REST API v1 (key-authenticated, scoped, SHA-256 at rest) sits on top.</li>
      <li><b>Background work.</b> A nightly Xano scheduled task refreshes stale insights at 2am UTC.</li>
      <li><b>Auth.</b> Xano auth on the user table; guest + email sessions across the app.</li>
      <li><b>Hosting.</b> The static front end deploys to Xano Static Hosting.</li>
      <li><b>The audit trail.</b> Every AI invocation across all 10 features is logged to ai_generation_log (prompt, model, tokens, latency, status) — provable through the public endpoint or Xano Studio.</li>
    </ul>
    <p><b>Design reasoning.</b> Form structure changes at runtime, so each flowchart lives as a single JSONB document in Xano — loading is one query, saving is one write, and new validation rules need zero migrations. Zod is both schema and validator, constructed programmatically from that config, and runs identically in the browser and on the server.</p>`)}
  </section>

  ${h(5, 'Ten AI features', 'Three tiers of native AI',
    `${table([
      ['1', 'AI Form Generator', '/forms/ai', 'Prompt → complete flowchart in ~3s'],
      ['2', 'Submission Insights', '/forms/[id]/insights', '200 submissions → 3 bullets + sentiment + topics + quotes'],
      ['3', 'Smart Field Suggestions', 'in builder', 'Label → suggested type, placeholder, rules, options'],
      ['4', 'Conversational Mode', '/f/{shareId}/chat', 'Bot follows conditional logic, auto-submits at the end'],
      ['5', 'Smart Routing', '/forms/[id]/routing', 'Plain-English rules, AI-evaluated per submission'],
      ['6', 'Auto-Translation', '/forms/[id]/translate', 'One click → 10 languages, cached, auto-detected'],
      ['7', 'Voice Mode', '/f/{shareId}/voice', 'Whisper ASR → AI extracts structured answers'],
      ['8', 'Drop-off Analytics', '/forms/[id]/analytics', 'Field events → AI names the problem + concrete fix'],
      ['9', 'PDF Reports', '/api/submissions/[id]/pdf', 'Branded PDF with AI-written analyst notes'],
      ['10', 'Embeddable Widget SDK', '/sdk-demo', 'React widget for any site, any mode'],
    ], ['#', 'Feature', 'Where', 'What it does'])}
    <p class="small">Tier 1 = builder productivity · Tier 2 = reimagining the form experience · Tier 3 = polish + reach. All ten features are orchestrated by Xano function stacks; every call is logged to Xano's ai_generation_log for a provable audit trail.</p>`)}
  </section>

  ${h(6, 'The journey', 'From FormEngine Pro to Reform — and the week that followed',
    `<p>This repository began as <b>FormEngine Pro</b> and was rebranded to <b>Reform</b> in a single initial commit — monogram "R", internal Tailwind tokens renamed from <code>fe-</code> to <code>rf-</code>, favicon/icon set regenerated, and every "FormEngine Pro" reference rewritten. What followed was a burst of building and storytelling:</p>
    ${table([
      ['Aug 30', 'Architecture + Xano', '12 tables, 6 function stacks, REST API, auth'],
      ['Aug 30', 'Core form builder', 'Flowchart editor, schema generator, Zod engine'],
      ['Aug 30', 'AI integration', 'Generation, insights, routing, translation'],
      ['Aug 31', '10 AI feature pages', 'Conversational, voice, analytics, PDF, SDK'],
      ['Aug 31', 'Design pass', 'Sidebar + dashboard redesign, amber theming'],
      ['Sep 1', 'Rebrand complete', 'FormEngine Pro → Reform, full repo hygiene'],
      ['Sep 2', 'First demo films', 'Remotion screenshot walkthrough (ReformDemo) + cinematic'],
      ['Sep 3', 'Hackathon film v1', '4-minute product cinematic, two render pipelines'],
      ['Sep 3', 'The 3:00 re-cut', 'Narration re-aligned; scenes measured to the audio'],
      ['Sep 3', 'ElevenLabs narration', 'Purpose-written 3-min script, generated + measured'],
      ['Sep 3', 'Final render + media', 'Branded PDFs, submission zip, project overview'],
    ], ['Date', 'Milestone', 'What happened'])}
    <p><b>Build time:</b> ~18 focused hours for the platform, then a dedicated production week for the demo films, brand assets, and submission materials. Built with Claude Code (primary development agent) and Codebuff sessions, OpenAI gpt-4o-mini powering the runtime AI, local Whisper for voice, and Google Stitch for the original visual design direction.</p>`)}
  </section>

  ${h(7, 'The demo films', 'Three generations of video, one final 3:00 cut',
    `<p class="lead">The product deserved films that show the real thing. The final hackathon cinematic runs exactly 3:00 and every scene switch lands on a measured narration boundary.</p>
    <p><b>Generation 1 — the walkthrough.</b> A Loom screen recording of the flowchart builder, validation, API, and deployment in action, embedded in the README.</p>
    <p><b>Generation 2 — the marketing loop.</b> <code>ReformDemo</code> (Remotion): a 3-minute screenshot-based walkthrough in browser frames with cursor and callouts, embedded on the marketing homepage at <code>/reform-demo.mp4</code>.</p>
    <p><b>Generation 3 — the cinematic.</b> Two independent render pipelines producing the same film, kept in sync scene-for-scene:</p>
    <ul>
      <li><b>HyperFrames (HTML + Puppeteer)</b> — <code>reform-hyperframes/demo.html</code>, real app screens captured in a live browser, full-bleed Ken Burns camera moves, crossfades, chapter rail; captured at 1080p30 in parallel Chrome ranges.</li>
      <li><b>Remotion twin</b> — <code>remotion/src/ReformHackathon.tsx</code>, the same scene table rendered natively in React.</li>
    </ul>
    <p><b>The sync method.</b> Narration generated with ElevenLabs, then force-aligned word-by-word. Scene boundaries are derived from the <em>measured</em> alignment — visuals switch exactly when each voiceover paragraph starts. An imperceptible tempo correction (±3%) keeps the runtime precisely 3:00, and both pipelines consume the same measured scene table, so a re-narration needs zero code edits.</p>
    <p><b>The final film:</b> title → montage → live dashboard footage → AI generator → visual builder → conversational → voice + translation → submissions → metrics → analytics → one-platform mosaic → closing reel → end card → official "Made with Remotion" credit. Real Reform logo throughout; real app screens; no text over footage.</p>`)}
  </section>

  ${h(8, 'Brand & media', 'The mark, the palette, the assets',
    `<p>Reform's identity is a warm amber-on-charcoal system: an <b>amber gradient "R" / stacked-flow mark</b> (the ↗-style motion of a conversation), Space Grotesk for display, DM Sans for UI, on a near-black stone palette.</p>
    ${table([
      ['Background', '#0c0a09', 'The charcoal stage'],
      ['Accent amber', '#f59e0b → #d87900', 'Gradient for the mark and highlights'],
      ['Text', '#f5f5f4 / #a8a29e', 'Foreground and muted copy'],
      ['Status', '#55d28c (green)', 'Valid, live, healthy'],
    ], ['Role', 'Value', 'Usage'])}
    <p><b>Asset set.</b> The mark ships as SVG (<code>public/logo.svg</code>, <code>reform-mark.svg</code>) and as high-resolution transparent PNGs generated with sharp (<code>reform-mark.png</code> 1024², plus light/dark lockups at 1280×320), mirrored across <code>public/</code>, <code>reform-hyperframes/assets/</code>, and <code>remotion/public/reform-assets/</code>. A reusable generator script keeps every copy in sync.</p>`)}
  </section>

  ${h(9, 'Submission materials', 'Pitch, write-up, and the upload package',
    `<p>The hackathon story is told through a matched set of documents, all generated from the same brand system:</p>
    <ul>
      <li><b>Reform-Elevator-Pitch.pdf</b> — recommended tagline, the ~15-second spoken pitch, and five alternative taglines with rationale.</li>
      <li><b>Reform-Devpost-Submission.pdf</b> — the full public write-up: Inspiration, What it does, How we built it, Challenges, Accomplishments, What we learned, What's next.</li>
      <li><b>Reform-Hackathon-Submission.zip</b> — both PDFs plus a judge-facing README with the live app URL.</li>
      <li><b>Reform-Project-Overview.pdf</b> — this document.</li>
    </ul>
    <p class="small">Source copies of the write-up live in <code>docs/devpost-submission.md</code>; the PDFs are generated by reusable Puppeteer scripts in <code>reform-hyperframes/</code>.</p>`)}
  </section>

  ${h(10, "What's next", 'Roadmap for Reform',
    `<ol>
      <li>A template library and team collaboration inside the flowchart builder.</li>
      <li>Routing and follow-up questions that learn from past submissions.</li>
      <li>Deeper voice: multilingual conversation, offline mode, and a mobile experience.</li>
      <li>Plugging responses into the tools teams already live in — Slack, CRM, webhooks everywhere.</li>
      <li>Turning analytics into action: when the AI spots a drop-off, Reform proposes and applies the fix.</li>
    </ol>
    <p>The through-line stays the same: the form is the beginning of a workflow, not the end of a page — one platform where an idea becomes structure, structure meets people however they prefer to answer, and every response becomes the next better question.</p>`)}
  </section>

  <!-- APPENDIX -->
  <section class="pg">
    <div class="kicker"><span class="num">✦</span>Appendix</div>
    <h2>Quick reference</h2>
    <p><b>Live URLs</b></p>
    ${table([
      ['App', 'reform-7jo8.onrender.com'],
      ['Runtime (Vercel)', 'reform-pearl.vercel.app'],
      ['API docs', '/docs/api'],
      ['Loom walkthrough', 'loom.com/share/05d568bf4e314ae79a8eb902ecd5aa61'],
    ], ['What', 'Where'])}
    <p><b>Key commands</b></p>
    ${code(`cd reform
./scripts/dev.sh                  # one-command local dev (Node + Postgres)
docker compose up -d              # or: full local stack (Postgres + Ollama + Whisper)

# Demo films (Remotion compositions: ReformDemo · ReformHackathon · ReformCinematic)
cd remotion && npm run render                     # marketing loop
cd remotion && npm run render:hackathon           # 3:00 cinematic twin (1080p)
cd reform-hyperframes && ./render-parallel.sh     # HyperFrames capture+encode (wipe arg resets)

# Narration (ElevenLabs key in .env)
cd reform-hyperframes
node generate-narration.js && node align-audio.js && node build-scenes-3min.js

# Branded PDFs
cd reform-hyperframes
node make-pitch-pdf.js && node make-devpost-pdf.js && node make-project-pdf.js`)}
    <footer><span>Reform · Xano Hackathon 2026</span><span>Reform-Project-Overview.pdf</span></footer>
  </section>

</div></body></html>`;

(async () => {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (fs.existsSync(defaultChrome) ? defaultChrome : undefined);
  const browser = await puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 }).catch(async () => {
    await page.setContent(html.replace(/@import[^;]+;/, ''), { waitUntil: 'load' });
  });
  await page.pdf({
    path: outFile,
    format: 'Letter',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  await browser.close();
  console.log('✅ Wrote', outFile, `(${(fs.statSync(outFile).size / 1024).toFixed(0)} KB)`);
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });