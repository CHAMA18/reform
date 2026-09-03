/**
 * capture-all.js — Starts the Reform dev server, captures interactive screenshots, then shuts down.
 * Run from the reform-hyperframes directory: node capture-all.js
 */
const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const ROOT = __dirname;
const reformRoot = path.resolve(ROOT, '..');

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function waitForServer(url, maxWait = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => { res.destroy(); resolve(res.statusCode); });
        req.on('error', reject);
        req.setTimeout(3000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      return true;
    } catch { await wait(1000); }
  }
  return false;
}

(async () => {
  console.log('🚀 Starting Reform dev server...');
  const server = spawn('npm', ['run', 'dev'], {
    cwd: reformRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  server.stdout.on('data', (d) => {
    const s = d.toString();
    if (s.includes('Ready in')) console.log('   ✓ Server ready');
  });

  const ready = await waitForServer('http://localhost:3000');
  if (!ready) {
    console.error('❌ Server failed to start within 60s');
    server.kill();
    process.exit(1);
  }

  console.log('📸 Capturing interactive screenshots...\n');
  try {
    const output = execSync('node capture-interactive.js', {
      cwd: ROOT,
      stdio: 'pipe',
      timeout: 180000,
      env: { ...process.env },
    });
    console.log(output.toString());
  } catch (e) {
    console.log(e.stdout?.toString() || '');
    console.error(e.stderr?.toString() || e.message);
  }

  console.log('🛑 Stopping server...');
  server.kill();
  await wait(1000);
  process.exit(0);
})();
