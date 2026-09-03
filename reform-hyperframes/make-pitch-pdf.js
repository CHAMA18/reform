/* make-pitch-pdf.js — render the Reform elevator pitch + taglines as a branded PDF.
 * Run: node make-pitch-pdf.js [output.pdf]   (default: ../Reform-Elevator-Pitch.pdf)
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const outFile = path.resolve(__dirname, process.argv[2] || '../Reform-Elevator-Pitch.pdf');
const defaultChrome = path.join(process.env.HOME || '', '.cache/puppeteer/chrome-headless-shell/mac_arm-152.0.7977.54/chrome-headless-shell-mac-arm64/chrome-headless-shell');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 100%; min-height: 100vh; background: #0c0a09; color: #f5f5f4;
    font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
  .page { max-width: 860px; margin: 0 auto; padding: 64px 64px 48px; }
  header { display: flex; align-items: center; gap: 16px; }
  .mark { width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center;
    background: linear-gradient(135deg, #ffc247, #d87900); color: #fff; font-size: 24px;
    font-weight: 800; box-shadow: 0 0 34px rgba(245, 158, 11, .45); }
  .brand { font: 700 26px 'Space Grotesk', sans-serif; letter-spacing: -.02em; }
  .brand small { display: block; font: 500 12px 'DM Sans'; color: #a8a29e; letter-spacing: .18em;
    text-transform: uppercase; margin-top: 2px; }
  h1 { font: 700 46px/1.08 'Space Grotesk', sans-serif; letter-spacing: -.03em; margin: 46px 0 6px; }
  .sub { color: #a8a29e; font-size: 17px; line-height: 1.5; max-width: 640px; }
  section { margin-top: 44px; }
  .kicker { display: inline-block; color: #f59e0b; font: 700 12px 'DM Sans'; letter-spacing: .22em;
    text-transform: uppercase; margin-bottom: 14px; border: 1px solid rgba(245,158,11,.4);
    padding: 5px 12px; border-radius: 999px; }
  .tagline-hero { font: 700 58px/1.05 'Space Grotesk', sans-serif; letter-spacing: -.04em;
    color: #f59e0b; }
  .quote { border-left: 3px solid #f59e0b; background: rgba(245,158,11,.05);
    border-radius: 0 14px 14px 0; padding: 22px 26px; font-size: 19px; line-height: 1.62;
    color: #e7e5e4; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { text-align: left; font: 700 11px 'DM Sans'; letter-spacing: .16em; text-transform: uppercase;
    color: #a8a29e; padding: 0 14px 10px; }
  td { padding: 15px 14px; border-top: 1px solid rgba(255,255,255,.07); vertical-align: top; }
  td.t { font: 600 19px 'Space Grotesk', sans-serif; color: #f5f5f4; white-space: nowrap; }
  td.why { color: #a8a29e; font-size: 15px; line-height: 1.5; }
  .pick { color: #f59e0b; }
  footer { margin-top: 52px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,.08);
    display: flex; justify-content: space-between; color: #78716c; font-size: 13px; }
</style>
</head>
<body>
  <div class="page">
    <header>
      <div class="mark">R</div>
      <div class="brand">Reform<small>Elevator pitch &amp; taglines</small></div>
    </header>

    <h1>Reform, in one breath.</h1>
    <p class="sub">The short version of what Reform is and why it matters — for the video's opening line, a customer call, or the top of a deck. <b style="color:#f59e0b;">Built on Xano as its backend.</b></p>

    <section>
      <span class="kicker">Recommended tagline</span>
      <div class="tagline-hero">Forms that think dynamically.</div>
    </section>

    <section>
      <span class="kicker">Elevator pitch · ~15 seconds</span>
      <div class="quote">Reform turns a plain-language idea into a secure, adaptive form — no code required. You describe what you want to ask, Reform generates the structure and the logic, and you publish one form your customers can answer by typing, conversation, or voice, in their own language. Every response lands in one dashboard you can act on — and it's backed by a REST API, with the whole platform running on Xano as its backend.</div>
    </section>

    <section>
      <span class="kicker">Tagline alternatives</span>
      <table>
        <tr><th>Tagline</th><th>Why it works</th></tr>
        <tr><td class="t pick">Forms that think dynamically.</td><td class="why">Already the homepage hero. Bold, ownable, and leads with the adaptive/AI engine.</td></tr>
        <tr><td class="t">The operating system for better forms.</td><td class="why">Bigger ambition — positions Reform as the platform, not a form tool. Good for the end card.</td></tr>
        <tr><td class="t">One form. Every way to answer.</td><td class="why">Leads with the three journeys story: typed, conversational, and voice experiences from one flow.</td></tr>
        <tr><td class="t">From plain language to production forms.</td><td class="why">Leads with the AI generator — idea in, validated, publishable form out.</td></tr>
        <tr><td class="t">Ask better questions. Act on the answers.</td><td class="why">Outcome-driven — speaks to the team on the other side of the form.</td></tr>
      </table>
    </section>

    <footer><span>Reform</span><span>Backend: Xano · Simple language. One intelligent workflow.</span></footer>
  </div>
</body>
</html>`;

(async () => {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (fs.existsSync(defaultChrome) ? defaultChrome : undefined);
  const browser = await puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 }).catch(async () => {
    // fonts may fail to load offline — fall back to system fonts
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