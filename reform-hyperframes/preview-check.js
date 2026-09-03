/* preview-check.js — seek through every scene of demo.html, capture preview frames. */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'out', 'preview');
const defaultChrome = path.join(process.env.HOME || '', '.cache/puppeteer/chrome-headless-shell/mac_arm-152.0.7977.54/chrome-headless-shell-mac-arm64/chrome-headless-shell');

const LOGFILE = path.join(ROOT, 'out', 'preview-progress.log');
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
fs.writeFileSync(LOGFILE, '--- run ' + new Date().toISOString() + ' ---\n');
const logStream = fs.createWriteStream(LOGFILE, { flags: 'a' });
['log', 'error', 'warn'].forEach((k) => { const orig = console[k]; console[k] = (...a) => { orig(...a); logStream.write(a.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(' ') + '\n'); }; });

const STAMPS = [
  ['title', 6], ['loop-montage', 15], ['dashboard-live', 30], ['intent', 48],
  ['generator', 62], ['builder', 72], ['builder-flow', 91], ['chat', 100],
  ['voice', 112], ['translate', 116], ['submissions', 124], ['metrics', 136],
  ['analytics', 142], ['one-platform', 150], ['result-reel', 160], ['gravity', 178],
  ['loop-beat', 194], ['invitation', 208], ['final-card', 221], ['remotion-credit', 236],
];

const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout: ' + what)), ms))]);

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (fs.existsSync(defaultChrome) ? defaultChrome : undefined);
  console.log('launching browser...');
  const browser = await puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  // deterministic: only local file:// and data: resources (skip flaky remote font fetch)
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = req.url();
    if (u.startsWith('file:') || u.startsWith('data:') || u.startsWith('blob:')) req.continue();
    else req.abort();
  });

  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  console.log('navigating...');
  await withTimeout(page.goto('file://' + path.join(ROOT, 'demo.html'), { waitUntil: 'domcontentloaded', timeout: 20000 }), 30000, 'goto');
  await page.evaluate(() => { const t0 = performance.now(); window.__demoReady; }).catch(() => {});
  await withTimeout(page.waitForFunction('window.__demoReady === true', { timeout: 20000 }), 25000, 'ready');
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))])).catch(() => {});
  console.log('loaded & ready');

  for (const [name, t] of STAMPS) {
    await withTimeout(page.evaluate((time) => window.__setDemoTime(time), t), 12000, `setTime ${t}`);
    await new Promise((r) => setTimeout(r, 100));
    const state = await withTimeout(page.evaluate(() => {
      const vis = (id) => { const el = document.getElementById(id); return el ? !el.classList.contains('hidden') : null; };
      return {
        title: vis('titleScene'), media: vis('mediaScene'), grid: vis('gridScene'), end: vis('endScene'),
        hostOp: document.getElementById('mediaScene').style.opacity,
        shots: document.querySelectorAll('#mediaScene .shot').length,
        endCard: document.getElementById('endCard').style.opacity,
        credit: document.getElementById('creditCard').style.opacity,
        tiles: document.querySelectorAll('#gridScene .tile').length,
      };
    }), 8000, `state ${t}`);
    console.log(`  [${name} @${t}s]`, JSON.stringify(state));
    const fname = `${name}-${String(t).padStart(3, '0')}s.jpg`;
    await withTimeout(page.screenshot({ path: path.join(OUT, fname), type: 'jpeg', quality: 92, captureBeyondViewport: false }), 20000, `shot ${t}`);
    console.log(`  ✓ ${name} @ ${t}s -> ${fname}`);
  }

  let sweepErrors = 0;
  for (let t = 0; t < 240; t++) {
    if (t >= 26 && t <= 43) continue; // live-recording window — costly seeks
    const err = await withTimeout(page.evaluate((time) => {
      try { window.__setDemoTime(time); return null; } catch (e) { return String(e && e.message || e); }
    }, t), 8000, `sweep ${t}`).catch(e => String(e && e.message || e));
    if (err) { sweepErrors++; if (sweepErrors <= 5) errors.push(`sweep t=${t}: ${err}`); }
    if (t % 60 === 0) console.log(`  sweep ... ${t}s`);
  }
  console.log('  sweep ... done');
  await browser.close();
  fs.writeFileSync(path.join(ROOT, 'out', 'preview-progress.log'), fs.readFileSync(path.join(ROOT, 'out', 'preview-progress.log'), 'utf8') + '\nALL_DONE\n');

  if (errors.length) {
    console.log('\n⚠ ERRORS (' + errors.length + '):');
    errors.slice(0, 15).forEach((e) => console.log('   ' + e));
    process.exitCode = 1;
  } else {
    console.log('\n✅ No page errors, no sweep exceptions. Frames in ' + OUT);
  }
})().catch((e) => { console.error('FATAL:', e); process.exitCode = 1; });
