/**
 * render.js — Render HyperFrames HTML to MP4
 * 
 * Uses Puppeteer to capture frames and FFmpeg to encode video.
 */
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const CONFIG = {
  width: 1920,
  height: 1080,
  fps: 24,
  duration: 30, // seconds
  output: 'out/reform-hyperframes.mp4',
  htmlFile: 'index.html',
};

async function render() {
  console.log('🎬 Starting HyperFrames render...');
  
  // Create output directory
  const outDir = path.join(__dirname, 'out');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  // Create frames directory
  const framesDir = path.join(__dirname, 'frames');
  if (!fs.existsSync(framesDir)) {
    fs.mkdirSync(framesDir, { recursive: true });
  }
  
  // Launch Puppeteer
  console.log('🚀 Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Users/chunguchama/.cache/puppeteer/chrome-headless-shell/mac_arm-152.0.7977.54/chrome-headless-shell-mac-arm64/chrome-headless-shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: CONFIG.width, height: CONFIG.height });
  
  // Load HTML file
  const htmlPath = path.join(__dirname, CONFIG.htmlFile);
  console.log(`📄 Loading ${htmlPath}...`);
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
  
  // Wait for GSAP to load
  await page.waitForFunction(() => window.gsap !== undefined, { timeout: 10000 });
  
  // Get the total timeline duration
  const totalFrames = CONFIG.duration * CONFIG.fps;
  console.log(`🎞️  Rendering ${totalFrames} frames (${CONFIG.duration}s at ${CONFIG.fps}fps)...`);
  
  // Render each frame
  for (let frame = 0; frame < totalFrames; frame++) {
    const time = frame / CONFIG.fps;
    
    // Seek GSAP timeline to current time
    await page.evaluate((t) => {
      if (window.__timelines && window.__timelines.main) {
        window.__timelines.main.seek(t);
      }
    }, time);
    
    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Capture frame
    const framePath = path.join(framesDir, `frame-${String(frame).padStart(6, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png' });
    
    // Progress indicator
    if (frame % 30 === 0) {
      console.log(`  Frame ${frame}/${totalFrames} (${Math.round(time)}s)`);
    }
  }
  
  await browser.close();
  console.log('✅ Frames captured!');
  
  // Encode with FFmpeg
  console.log('🎥 Encoding video with FFmpeg...');
  const outputPath = path.join(__dirname, CONFIG.output);
  const framesPattern = path.join(framesDir, 'frame-%06d.png');
  
  execSync(
    `ffmpeg -y -framerate ${CONFIG.fps} -i "${framesPattern}" -c:v libx264 -pix_fmt yuv420p -crf 18 "${outputPath}"`,
    { stdio: 'inherit' }
  );
  
  // Clean up frames
  console.log('🧹 Cleaning up frames...');
  execSync(`rm -rf "${framesDir}"`);
  
  console.log(`\n✅ Render complete! Output: ${outputPath}`);
}

render().catch(console.error);
