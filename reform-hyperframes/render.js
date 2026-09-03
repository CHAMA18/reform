/**
 * render.js — Render real-navigation HyperFrames demo to H.264 MP4.
 * Launches Puppeteer, navigates the live Reform app, captures frames, and encodes with FFmpeg.
 */
const puppeteer = require('puppeteer');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const CONFIG = {
  width: 1920,
  height: 1080,
  fps: Number(process.env.VIDEO_FPS || 30),
  duration: Number(process.env.VIDEO_DURATION || 180),
  quality: Number(process.env.VIDEO_CRF || 16),
  captureFormat: process.env.VIDEO_CAPTURE_FORMAT || 'jpeg',
  captureQuality: Number(process.env.VIDEO_CAPTURE_QUALITY || 97),
  output: 'out/reform-hyperframes.mp4',
};

async function render() {
  const root = __dirname;
  const outDir = path.join(root, 'out');
  const framesDir = path.join(root, 'frames');
  fs.mkdirSync(outDir, { recursive: true });
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  console.log(`🎬 Rendering ${CONFIG.duration}s real-navigation demo (${CONFIG.fps}fps)`);
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || path.join(
    process.env.HOME || '',
    '.cache/puppeteer/chrome-headless-shell/mac_arm-152.0.7977.54/chrome-headless-shell-mac-arm64/chrome-headless-shell',
  );
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: fs.existsSync(executablePath) ? executablePath : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: CONFIG.width, height: CONFIG.height, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const type = request.resourceType();
    if (['font', 'image', 'stylesheet', 'script', 'document', 'xhr', 'fetch'].includes(type)) request.continue();
    else request.abort();
  });
  await page.goto('http://localhost:3000/api/auth/guest?redirect=%2Fdashboard', { waitUntil: 'networkidle0' });
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
    `,
  });

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const moveMouse = async (selector) => {
    const target = await page.$(selector);
    if (!target) return false;
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) return false;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 24 });
    await wait(220);
    return true;
  };
  const clickWithCursor = async (selector) => {
    if (!(await moveMouse(selector))) return false;
    await page.mouse.down();
    await wait(90);
    await page.mouse.up();
    await wait(180);
    return true;
  };
  const typeInto = async (selector, text, delay = 32) => {
    const input = await page.$(selector);
    if (!input) return false;
    const box = await input.boundingBox();
    if (box) await page.mouse.move(box.x + Math.min(box.width / 2, 80), box.y + box.height / 2, { steps: 20 });
    await page.mouse.click(box ? box.x + Math.min(box.width / 2, 80) : 0, box ? box.y + box.height / 2 : 0);
    await wait(180);
    await input.type(text, { delay });
    return true;
  };

  const actions = [
    { route: '/dashboard', seconds: 18, label: 'Dashboard', interact: async () => { await moveMouse('button'); } },
    { route: '/forms/ai', seconds: 28, label: 'AI Generator', interact: async () => {
      await typeInto('textarea', 'Create an NPS survey with name, email, a 0-10 rating, category, and comments.', 42);
      await wait(1200);
    } },
    { route: '/forms/new', seconds: 28, label: 'Builder', interact: async () => {
      await typeInto('input[placeholder="My Awesome Form"]', 'Customer feedback survey', 48);
      await wait(900);
    } },
    { route: '/forms/chat', seconds: 20, label: 'Conversational form', interact: async () => {
      await typeInto('input[placeholder="Type your answer..."]', 'Jordan', 70);
      await page.keyboard.press('Enter');
      await wait(1000);
    } },
    { route: '/forms/voice', seconds: 16, label: 'Voice mode' },
    { route: '/forms/translate', seconds: 15, label: 'Auto-translation', interact: async () => {
      await clickWithCursor('button:nth-of-type(5)');
      await wait(700);
    } },
    { route: '/forms/routing', seconds: 20, label: 'Smart routing', interact: async () => {
      await clickWithCursor('button:nth-of-type(8)');
      await wait(700);
    } },
    { route: '/submissions', seconds: 18, label: 'Submissions' },
    { route: '/forms/analytics', seconds: 12, label: 'Analytics' },
    { route: '/api-keys', seconds: 10, label: 'API keys' },
    { route: '/settings', seconds: 8, label: 'Settings' },
    { route: '/dashboard', seconds: 7, label: 'Close' },
  ];

  let elapsed = 0;
  for (const action of actions) {
    action.start = elapsed;
    action.end = elapsed + action.seconds;
    elapsed = action.end;
    const started = Date.now();
    await page.goto(`http://localhost:3000${action.route}`, { waitUntil: 'networkidle0' });
    await wait(700);
    if (action.interact) await action.interact();
    console.log(`  ${action.label}`);
    await wait(Math.max(0, action.seconds * 1000 - (Date.now() - started)));
  }
  if (elapsed < CONFIG.duration) {
    actions[actions.length - 1].seconds += CONFIG.duration - elapsed;
    actions[actions.length - 1].end = CONFIG.duration;
  }
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
  await wait(500);

  const totalFrames = CONFIG.duration * CONFIG.fps;
  for (let frame = 0; frame < totalFrames; frame++) {
    const action = actions.find((c) => frame / CONFIG.fps >= c.start && frame / CONFIG.fps < c.end);
    if (action && action.route !== page.url().replace('http://localhost:3000', '')) {
      await page.goto(`http://localhost:3000${action.route}`, { waitUntil: 'networkidle0' });
      await page.addStyleTag({ content: 'html, body { background: #0b0a09 !important; color: #f5f1eb !important; } [class*="bg-white"], [class*="bg-gray"] { background-color: #171411 !important; } [class*="text-black"], [class*="text-gray-900"] { color: #f5f1eb !important; } [class*="text-gray-500"], [class*="text-gray-600"] { color: #a8a099 !important; } [class*="border-gray"], [class*="border-white"] { border-color: #342b24 !important; } input, textarea, select { background-color: #100e0c !important; color: #f5f1eb !important; border-color: #4b3928 !important; }' });
      await wait(700);
      if (action.interact) await action.interact();
    }
    const ext = CONFIG.captureFormat === 'png' ? 'png' : 'jpg';
    await page.screenshot({
      path: path.join(framesDir, `frame-${String(frame).padStart(6, '0')}.${ext}`),
      type: CONFIG.captureFormat === 'png' ? 'png' : 'jpeg',
      ...(CONFIG.captureFormat === 'png' ? {} : { quality: CONFIG.captureQuality }),
      captureBeyondViewport: false,
    });
    if (frame % (CONFIG.fps * 5) === 0) console.log(`  ${Math.round(frame / CONFIG.fps)}s / ${CONFIG.duration}s`);
  }
  await browser.close();

  const output = path.join(root, CONFIG.output);
  const ext = CONFIG.captureFormat === 'png' ? 'png' : 'jpg';
  execFileSync('ffmpeg', [
    '-y', '-framerate', String(CONFIG.fps),
    '-i', path.join(framesDir, `frame-%06d.${ext}`),
    '-c:v', 'libx264', '-preset', process.env.VIDEO_PRESET || 'slow', '-tune', 'animation',
    '-crf', String(CONFIG.quality), '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
    '-movflags', '+faststart', output,
  ], { stdio: 'inherit' });
  fs.rmSync(framesDir, { recursive: true, force: true });
  console.log(`✅ Wrote ${output}`);
}

render().catch((error) => { console.error(error); process.exitCode = 1; });
