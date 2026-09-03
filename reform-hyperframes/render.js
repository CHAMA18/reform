/**
 * render.js — Render HyperFrames HTML to MP4
 * Uses Puppeteer to capture frames and FFmpeg to encode video.
 */
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const CONFIG = {
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 70,
  output: 'out/reform-demo.mp4',
  htmlFile: 'index.html',
};

async function render() {
  console.log('🎬 Starting HyperFrames render...');
  
  const outDir = path.join(__dirname, 'out');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  
  const framesDir = path.join(__dirname, 'frames');
  if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true });
  fs.mkdirSync(framesDir, { recursive: true });
  
  console.log('🚀 Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: CONFIG.width, height: CONFIG.height, deviceScaleFactor: 1 });
  
  const htmlPath = path.join(__dirname, CONFIG.htmlFile);
  console.log(`📄 Loading ${htmlPath}...`);
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Wait for the demo to be ready
  await page.waitForFunction('window._demoReady === true', { timeout: 10000 });
  console.log('✅ Demo ready, starting frame capture...');
  
  const totalFrames = CONFIG.fps * CONFIG.duration;
  console.log(`📸 Capturing ${totalFrames} frames at ${CONFIG.fps}fps...`);
  
  for (let i = 0; i < totalFrames; i++) {
    const timeMs = (i / CONFIG.fps) * 1000;
    
    // Set the page time by evaluating a time-update function
    await page.evaluate((ms) => {
      // The scenes are controlled by setTimeout, so we just wait
      // for the right amount of time. For frame-perfect capture,
      // we'd need to control time directly — but Puppeteer's
      // approach is to just advance and screenshot.
    }, timeMs);
    
    // Wait for the right moment
    await new Promise(resolve => setTimeout(resolve, 1000 / CONFIG.fps));
    
    const framePath = path.join(framesDir, `frame-${String(i).padStart(6, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png' });
    
    if (i % 30 === 0) {
      console.log(`  Frame ${i}/${totalFrames} (${Math.round(i/totalFrames*100)}%)`);
    }
  }
  
  console.log('✅ Frame capture complete');
  await browser.close();
  
  // Encode with FFmpeg
  console.log('🎬 Encoding video with FFmpeg...');
  const outputPath = path.join(__dirname, CONFIG.output);
  const framesPattern = path.join(framesDir, 'frame-%06d.png');
  
  execSync(
    `ffmpeg -y -framerate ${CONFIG.fps} -i "${framesPattern}" ` +
    `-c:v libx264 -crf ${CONFIG.quality || 18} -pix_fmt yuv420p ` +
    `-movflags +faststart "${outputPath}"`,
    { stdio: 'inherit' }
  );
  
  console.log(`✅ Video saved to ${outputPath}`);
  
  // Clean up frames
  fs.rmSync(framesDir, { recursive: true });
  console.log('🧹 Cleaned up frames');
}

render().catch(err => {
  console.error('❌ Render failed:', err);
  process.exit(1);
});
