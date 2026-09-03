/* probe-3min.js — seek through every scene of the 3-minute cut (180s), capture preview frames. */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'out', 'preview-3min');
const defaultChrome = path.join(process.env.HOME || '', '.cache/puppeteer/chrome-headless-shell/mac_arm-152.0.7977.54/chrome-headless-shell-mac-arm64/chrome-headless-shell');

// (label, seconds) — one probe per scene, mid-scene, plus the end-card and credit
const STAMPS = [
  ['title', 5], ['montage', 15], ['live-video', 25], ['gen-prompt', 40],
  ['generator', 52], ['builder', 65], ['chat', 80], ['voice', 91],
  ['submissions', 101], ['metrics', 111], ['analytics', 119], ['mosaic', 129],
  ['invitation', 148], ['final-card', 165], ['remotion-credit', 175],
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
  await withTimeout(page.waitForFunction('window.__demoReady === true', { timeout: 20000 }), 25000, 'ready');
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))])).catch(() => {});
  console.log('loaded & ready');

  for (const [name, t] of STAMPS) {
    await withTimeout(page.evaluate((time) => window.__setDemoTime(time), t), 12000, `setTime ${t}`);
    await new Promise((r) => setTimeout(r, 120));
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
    await withTimeout(page.screenshot({ path: path.join(OUT, `${name}-${String(t).padStart(3, '0')}s.jpg`), type: 'jpeg', quality: 92, captureBeyondViewport: false }), 20000, `shot ${t}`);
  }

  await browser.close();
  if (errors.length) {
    console.log('\n⚠ ERRORS (' + errors.length + '):');
    errors.slice(0, 15).forEach((e) => console.log('   ' + e));
    process.exitCode = 1;
  } else {
    console.log('\n✅ No page errors. Frames in ' + OUT);
  }
})().catch((e) => { console.error('FATAL:', e); process.exitCode = 1; });