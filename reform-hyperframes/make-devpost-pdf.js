/* make-devpost-pdf.js — render the Reform Devpost write-up as a branded PDF.
 * Run: node make-devpost-pdf.js [output.pdf]   (default: ../Reform-Devpost-Submission.pdf)
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const outFile = path.resolve(__dirname, process.argv[2] || '../Reform-Devpost-Submission.pdf');
const defaultChrome = path.join(process.env.HOME || '', '.cache/puppeteer/chrome-headless-shell/mac_arm-152.0.7977.54/chrome-headless-shell-mac-arm64/chrome-headless-shell');

const sec = (n, kicker, title, bodyHtml) => `
  <section>
    <div class="kicker"><span class="num">${n}</span>${kicker}</div>
    ${title ? `<h2>${title}</h2>` : ''}
    ${bodyHtml}
  </section>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 100%; background: #0c0a09; color: #f5f5f4;
    font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
  .page { max-width: 820px; margin: 0 auto; padding: 58px 60px 40px; }
  header { display: flex; align-items: center; gap: 16px; }
  .mark { width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center;
    background: linear-gradient(135deg, #ffc247, #d87900); color: #fff; font-size: 24px;
    font-weight: 800; box-shadow: 0 0 34px rgba(245, 158, 11, .45); }
  .brand { font: 700 26px 'Space Grotesk', sans-serif; letter-spacing: -.02em; }
  .brand small { display: block; font: 500 11px 'DM Sans'; color: #a8a29e; letter-spacing: .18em;
    text-transform: uppercase; margin-top: 2px; }
  h1 { font: 700 44px/1.08 'Space Grotesk', sans-serif; letter-spacing: -.03em; margin: 42px 0 8px; }
  .sub { color: #a8a29e; font-size: 16px; line-height: 1.5; max-width: 640px; }
  section { margin-top: 38px; page-break-inside: avoid; }
  h2 { font: 700 24px/1.2 'Space Grotesk', sans-serif; letter-spacing: -.01em; margin: 4px 0 12px; }
  .kicker { display: inline-flex; align-items: center; gap: 9px; color: #f59e0b;
    font: 700 11px 'DM Sans'; letter-spacing: .2em; text-transform: uppercase; }
  .num { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px;
    background: rgba(245,158,11,.14); border: 1px solid rgba(245,158,11,.45); font-size: 11px; }
  p { font-size: 15.5px; line-height: 1.66; color: #e7e5e4; margin-bottom: 10px; }
  ul { list-style: none; }
  li { position: relative; padding-left: 22px; font-size: 15.5px; line-height: 1.62;
    color: #e7e5e4; margin-bottom: 9px; }
  li::before { content: ''; position: absolute; left: 2px; top: 9px; width: 8px; height: 8px;
    border-radius: 3px; background: linear-gradient(135deg, #f59e0b, #d87900); }
  b, strong { color: #f5f5f4; }
  em { color: #f59e0b; font-style: normal; }
  footer { margin-top: 46px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,.08);
    display: flex; justify-content: space-between; color: #78716c; font-size: 12px; }
</style>
</head>
<body>
  <div class="page">
    <header>
      <div class="mark">R</div>
      <div class="brand">Reform<small>Hackathon submission</small></div>
    </header>

    <h1>Reform — Devpost / Xano Hackathon 2026</h1>
    <p class="sub">The full write-up: inspiration, what it does, how we built it, and what's next. <b style="color:#f59e0b;">Xano is the backend used overall.</b></p>

    ${sec(1, 'Inspiration', '', `<p>Most forms are treated like documents: a box to fill in, a button to press, and a spreadsheet nobody wants to read. But a form is really the first conversation between a team and the people it serves — and most tools end that conversation the second it starts. The form gets built in one tool, its logic lives in another, and the answers die in a third.</p><p>We wanted the form to be the beginning of a workflow, not the end of a page: one place where an idea becomes a validated structure, that structure meets people however they prefer to answer, and every response turns into signal the team can act on.</p>`)}

    ${sec(2, 'What it does', 'Reform turns a plain-language idea into a secure, adaptive form — no code.', `<ul>
      <li><b>Describe it, get a form.</b> The AI generator turns a sentence like "an NPS survey with a rating and comments" into a real structure: fields, options, validation, and a publishable flow.</li>
      <li><b>See the logic, not just the UI.</b> A visual flowchart builder (5 node types, 13 field types, conditional branches) makes every decision explicit and editable — the same form config drives validation on the client <em>and</em> the server via a single Zod-powered engine.</li>
      <li><b>One flow, three journeys.</b> Respondents can answer by typing, in a natural AI conversation, or with their voice (local Whisper transcription, 99 languages). Translation is one click and auto-detects the visitor's language.</li>
      <li><b>Every response becomes signal.</b> Submissions stream into a real-time dashboard; per-field event analytics (focus, abandon, drop-off) get an AI read with concrete fixes; plain-English routing rules fire email, webhook, or Slack actions.</li>
      <li><b>Built for developers too.</b> Scoped, rotatable API keys (SHA-256 at rest) with a clean REST API — the whole workflow is programmable.</li>
    </ul>    <p>Every piece of state — form schemas, flows, translations, routing rules, submissions, field events — lives in Xano, and every AI call is orchestrated by Xano function stacks. One backend, one system, end to end.</p>`)}

    ${sec(3, 'How we built it', '', `<ul>
      <li><b>Product:</b> Next.js + TypeScript + Tailwind on the front, and <b>Xano as the backend used overall</b> — 12 Xano tables hold every form schema, submission, translation, routing rule, and field event; six XanoScript function stacks orchestrate the AI (generation, insights, routing, audit); Xano auth, a nightly scheduled task, a REST API group, and Xano Static Hosting round out the platform. A Zod schema compiled from the form config validates identically in the browser and on the server.</li>
      <li><b>Voice:</b> a local Whisper transcription server keeps audio on the respondent's machine while the AI extracts structured answers from free-form speech.</li>
      <li><b>The film:</b> we produced a 3-minute cinematic demo of the real product — actual screens captured in a live browser, then cut so every scene switch lands exactly on the narration. Narration was generated with ElevenLabs and re-aligned word-by-word; the measured audio boundaries drive the visuals in two independent render pipelines (Remotion and an HTML/Puppeteer engine) that stay in sync.</li>
    </ul>`)}

    ${sec(4, 'Challenges we ran into', '', `<ul>
      <li><b>One schema, many surfaces.</b> The same form must render as a typed page, a conversation, and a voice interaction with identical validation and submission behavior. Getting the flow graph, the generated schema, and every experience to agree took several iterations.</li>
      <li><b>Voice that feels natural.</b> Transcription alone isn't enough — the AI has to know which spoken sentence answers which field, and the whole thing has to feel hands-free, not like dictation.</li>
      <li><b>Keeping the film honest.</b> The demo shows the real product, so the visuals had to be pixel-faithful and the narration had to match the runtime exactly. We regenerated the voiceover, measured every word's timestamp, and re-derived all 13 scene boundaries from audio — including an imperceptible tempo correction to land precisely on 3:00 without breaking sync.</li>
    </ul>`)}

    ${sec(5, "Accomplishments that we're proud of", '', `<ul>
      <li>A <b>working product</b>, not a mockup — you can build, publish, and answer a real form end to end, and the demo film is footage of that real product.</li>
      <li><b>Three journeys from one flow</b>: typed, conversational, and voice experiences sharing one schema, validation, and submission pipeline.</li>
      <li><b>AI that's native, not bolted on</b>: prompt-to-form generation, drop-off analysis that names the problem and suggests the fix, and routing rules written in plain English.</li>
      <li>The film itself: real logos, real screens, and visuals locked to the narration to the millisecond.</li>
    </ul>`)}

    ${sec(6, 'What we learned', '', `<ul>
      <li>The quality of a form is the quality of the first conversation a team has with the people it serves — meet people where they are (voice, chat, their language) and the signal gets better.</li>
      <li>Measured beats guessed: once we derived scene cuts from word-level audio alignment, the video and the voice finally felt like one thing.</li>
      <li>Keeping validation and state in one engine (and one backend) is what makes "one platform" a real claim instead of a slogan.</li>
    </ul>`)}

    ${sec(7, "What's next for Reform", '', `<ul>
      <li>A template library and team collaboration inside the flowchart builder.</li>
      <li>Routing and follow-up questions that learn from past submissions.</li>
      <li>Deeper voice: multilingual conversation, offline mode, and a mobile experience.</li>
      <li>Plugging responses into the tools teams already live in — Slack, CRM, webhooks everywhere.</li>
      <li>Turning analytics into action: when the AI spots a drop-off, Reform proposes and applies the fix.</li>
    </ul>`)}

    <footer><span>Reform</span><span>Simple language. One intelligent workflow.</span></footer>
  </div>
</body>
</html>`;

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