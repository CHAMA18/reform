const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
const shotsDir = path.join(ROOT, 'app-shots');
const defaultChrome = path.join(process.env.HOME || '', '.cache/puppeteer/chrome-headless-shell/mac_arm-152.0.7977.54/chrome-headless-shell-mac-arm64/chrome-headless-shell');

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function safeGoto(page, url, opts = {}) {
  const timeout = opts.timeout || 45000;
  try {
    await page.goto(url, { waitUntil: 'load', timeout });
  } catch (e) {
    console.log(`     ⚠️  Navigation partial, continuing...`);
  }
}

async function capture() {
  console.log('📸 Reform Interactive Screenshot Capture\n');

  // Check server with http module (more reliable than fetch)
  const serverOk = await new Promise(resolve => {
    const http = require('http');
    const req = http.get('http://localhost:3000', res => { resolve(res.statusCode === 200); req.destroy(); });
    req.on('error', () => resolve(false));
    req.setTimeout(5000, () => { req.destroy(); resolve(false); });
  });
  if (!serverOk) {
    console.error('❌ Cannot reach localhost:3000 — start the app first with: npm run dev');
    process.exit(1);
  }
  console.log('✅ Server is running\n');

  fs.mkdirSync(shotsDir, { recursive: true });

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (fs.existsSync(defaultChrome) ? defaultChrome : undefined);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  // Dark theme
  await page.addStyleTag({
    content: `
      :root { color-scheme: dark; }
      html, body { background: #0b0a09 !important; color: #f5f1eb !important; }
      button, input, textarea, select { font-family: inherit !important; }
      [class*="bg-white"], [class*="bg-gray"] { background-color: #171411 !important; }
      [class*="text-black"], [class*="text-gray-900"] { color: #f5f1eb !important; }
      [class*="text-gray-500"], [class*="text-gray-600"] { color: #a8a099 !important; }
      [class*="border-gray"], [class*="border-white"] { border-color: #342b24 !important; }
      input, textarea, select { background-color: #100e0c !important; color: #f5f1eb !important; border-color: #4b3928 !important; }
    `
  });

  const typeHuman = async (selector, text, opts = {}) => {
    const { charDelay = 35 } = opts;
    const el = await page.$(selector);
    if (!el) return false;
    const box = await el.boundingBox();
    if (!box) return false;
    await page.mouse.move(box.x + Math.min(box.width / 2, 120), box.y + box.height / 2, { steps: 18 });
    await wait(150);
    await page.mouse.click(box.x + Math.min(box.width / 2, 120), box.y + box.height / 2);
    await wait(200);
    await el.type(text, { delay: charDelay });
    return true;
  };

  const saveShot = async (name, label) => {
    const outPath = path.join(shotsDir, name);
    await page.screenshot({ path: outPath, type: 'png', captureBeyondViewport: false });
    const size = fs.statSync(outPath).size;
    console.log(`     ✅ ${label} → ${name} (${Math.round(size / 1024)}KB)`);
  };

  const hoverAt = async (selector) => {
    const els = await page.$$(selector);
    if (els.length > 0) {
      const box = await els[0].boundingBox();
      if (box) { await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 }); await wait(350); return true; }
    }
    return false;
  };

  const clickAt = async (selector) => {
    const els = await page.$$(selector);
    if (els.length > 0) {
      const box = await els[0].boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 });
        await wait(200);
        await page.mouse.down();
        await wait(80);
        await page.mouse.up();
        await wait(300);
        return true;
      }
    }
    return false;
  };

  // ═══════════════════════════════════════════════════════════════
  // 1. DASHBOARD
  // ═══════════════════════════════════════════════════════════════
  console.log('  📷 1. Dashboard — workspace overview');
  await safeGoto(page, 'http://localhost:3000/api/auth/guest?redirect=%2Fdashboard');
  await wait(4000);
  // Hover over a form card
  await hoverAt('a[href*="/forms/"], a[href*="/dashboard"]');
  await wait(400);
  await saveShot('dashboard.png', 'Dashboard with hover state');

  // ═══════════════════════════════════════════════════════════════
  // 2. AI GENERATOR — with prompt typed
  // ═══════════════════════════════════════════════════════════════
  console.log('  📷 2. AI Generator — prompt being typed');
  await safeGoto(page, 'http://localhost:3000/forms/ai');
  await wait(3000);
  await typeHuman('textarea', 'Create a customer satisfaction survey with name, email, satisfaction rating 1-5, product category dropdown, and open comments.', { charDelay: 22 });
  await wait(600);
  // Click generate button
  await clickAt('button[type="submit"], button');
  await wait(4000);
  await saveShot('ai-gen.png', 'AI Generator with prompt');

  // ═══════════════════════════════════════════════════════════════
  // 3. BUILDER — with form name and fields
  // ═══════════════════════════════════════════════════════════════
  console.log('  📷 3. Builder — form editing');
  await safeGoto(page, 'http://localhost:3000/forms/new');
  await wait(3000);
  await typeHuman('input[placeholder="My Awesome Form"]', 'Customer Feedback Survey', { charDelay: 28 });
  await wait(600);
  // Hover over a field/node
  await hoverAt('[class*="node"], [class*="field"], [class*="card"], [draggable]');
  await wait(400);
  await saveShot('builder.png', 'Builder with form name');

  // ═══════════════════════════════════════════════════════════════
  // 4. CHAT FORM — conversation in progress
  // ═══════════════════════════════════════════════════════════════
  console.log('  📷 4. Chat Form — conversation flow');
  await safeGoto(page, 'http://localhost:3000/forms/chat');
  await wait(3000);
  await typeHuman('input[placeholder="Type your answer..."]', 'Alex Morgan', { charDelay: 50 });
  await wait(300);
  await page.keyboard.press('Enter');
  await wait(2500);
  // Try second question
  const chatInput2 = await page.$('input[placeholder="Type your answer..."]');
  if (chatInput2) {
    await typeHuman('input[placeholder="Type your answer..."]', 'alex@company.com', { charDelay: 40 });
    await wait(300);
    await page.keyboard.press('Enter');
    await wait(2000);
  }
  await saveShot('chat.png', 'Chat form mid-conversation');

  // ═══════════════════════════════════════════════════════════════
  // 5. SUBMISSIONS — with hover on row
  // ═══════════════════════════════════════════════════════════════
  console.log('  📷 5. Submissions — response inspection');
  await safeGoto(page, 'http://localhost:3000/submissions');
  await wait(3000);
  // Hover over a submission row
  await hoverAt('tr, [class*="row"], [class*="item"], [class*="entry"]');
  await wait(400);
  await saveShot('submissions.png', 'Submissions with row hover');

  // ═══════════════════════════════════════════════════════════════
  // 6. VOICE MODE
  // ═══════════════════════════════════════════════════════════════
  console.log('  📷 6. Voice Mode');
  await safeGoto(page, 'http://localhost:3000/forms/voice');
  await wait(3500);
  await saveShot('voice.png', 'Voice mode interface');

  // ═══════════════════════════════════════════════════════════════
  // 7. TRANSLATE
  // ═══════════════════════════════════════════════════════════════
  console.log('  📷 7. Auto-Translation');
  await safeGoto(page, 'http://localhost:3000/forms/translate');
  await wait(3000);
  await hoverAt('select, button');
  await wait(400);
  await saveShot('translate.png', 'Translation interface');

  // ═══════════════════════════════════════════════════════════════
  // 8. ROUTING
  // ═══════════════════════════════════════════════════════════════
  console.log('  📷 8. Smart Routing');
  await safeGoto(page, 'http://localhost:3000/forms/routing');
  await wait(3000);
  await hoverAt('button, [class*="rule"], [class*="route"]');
  await wait(400);
  await saveShot('routing.png', 'Smart routing rules');

  // ═══════════════════════════════════════════════════════════════
  // 9. ANALYTICS
  // ═══════════════════════════════════════════════════════════════
  console.log('  📷 9. Analytics');
  await safeGoto(page, 'http://localhost:3000/forms/analytics');
  await wait(3500);
  await saveShot('analytics.png', 'Analytics charts');

  // ═══════════════════════════════════════════════════════════════
  // 10. API KEYS
  // ═══════════════════════════════════════════════════════════════
  console.log('  📷 10. API Keys');
  await safeGoto(page, 'http://localhost:3000/api-keys');
  await wait(3000);
  await saveShot('api-keys.png', 'API keys page');

  await browser.close();
  console.log('\n✅ All interactive screenshots captured');
  console.log(`   Saved to: ${shotsDir}/`);
}

capture().catch(e => { console.error(e); process.exitCode = 1; });
