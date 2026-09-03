const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
const shotsDir = path.join(ROOT, 'app-shots');
const defaultChrome = path.join(process.env.HOME || '', '.cache/puppeteer/chrome-headless-shell/mac_arm-152.0.7977.54/chrome-headless-shell-mac-arm64/chrome-headless-shell');

const SCREENSHOTS = [
  { route: '/api/auth/guest?redirect=%2Fdashboard', file: 'dashboard.png', wait: 3000, label: 'Dashboard' },
  { route: '/forms/ai', file: 'ai-gen.png', wait: 3000, label: 'AI Generator' },
  { route: '/forms/new', file: 'builder.png', wait: 3000, label: 'Builder' },
  { route: '/submissions', file: 'submissions.png', wait: 3000, label: 'Submissions' },
  { route: '/forms/chat', file: 'chat.png', wait: 3000, label: 'Chat Form' },
];

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function capture() {
  console.log('📸 Reform Screenshot Capture');
  console.log('   Target: http://localhost:3000\n');

  // Verify server is running
  try {
    const res = await fetch('http://localhost:3000');
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    console.log('✅ Server is running\n');
  } catch (e) {
    console.error('❌ Cannot reach localhost:3000 — start the app first with: npm run dev');
    process.exit(1);
  }

  fs.mkdirSync(shotsDir, { recursive: true });

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (fs.existsSync(defaultChrome) ? defaultChrome : undefined);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  // Dark theme override for consistent look
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

  for (const shot of SCREENSHOTS) {
    const url = `http://localhost:3000${shot.route}`;
    console.log(`  📷 ${shot.label}: ${url}`);

    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
      await wait(shot.wait);

      const outPath = path.join(shotsDir, shot.file);
      await page.screenshot({
        path: outPath,
        type: 'png',
        captureBeyondViewport: false,
      });

      const size = fs.statSync(outPath).size;
      console.log(`     ✅ Saved ${shot.file} (${Math.round(size / 1024)}KB)`);
    } catch (e) {
      console.log(`     ⚠️  Failed: ${e.message}`);
    }
  }

  await browser.close();
  console.log('\n✅ Screenshot capture complete');
}

capture().catch(e => { console.error(e); process.exitCode = 1; });
