const puppeteer = require('puppeteer');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
const FPS = Number(process.env.VIDEO_FPS || 30);
const WIDTH = 1920;
const HEIGHT = 1080;
const DURATION = 180;
const framesDir = path.join(ROOT, 'frames-demo');
const outDir = path.join(ROOT, 'out');
const assetsDir = path.join(ROOT, 'assets');
const captureQuality = Number(process.env.VIDEO_CAPTURE_QUALITY || 95);
const crf = Number(process.env.VIDEO_CRF || 16);
const resume = process.env.RESUME === '1';
const frameStart = Number(process.env.FRAME_START || 0);
const frameEndCap = process.env.FRAME_END ? Number(process.env.FRAME_END) : Infinity;
const skipEncode = process.env.SKIP_ENCODE === '1';
const defaultChrome = path.join(process.env.HOME || '', '.cache/puppeteer/chrome-headless-shell/mac_arm-152.0.7977.54/chrome-headless-shell-mac-arm64/chrome-headless-shell');

const sourceAssets = {
  'dashboard.png': path.join(ROOT, 'app-shots', 'dashboard.png'),
  'ai-gen.png': path.join(ROOT, 'app-shots', 'ai-gen.png'),
  'builder.png': path.join(ROOT, 'app-shots', 'builder.png'),
  'submissions.png': path.join(ROOT, 'app-shots', 'submissions.png'),
  'chat.png': path.join(ROOT, 'app-shots', 'chat.png'),
  'voice.png': path.join(ROOT, 'app-shots', 'voice.png'),
  'translate.png': path.join(ROOT, 'app-shots', 'translate.png'),
  'routing.png': path.join(ROOT, 'app-shots', 'routing.png'),
  'analytics.png': path.join(ROOT, 'app-shots', 'analytics.png'),
  'api-keys.png': path.join(ROOT, 'app-shots', 'api-keys.png'),
  'first.mp4': path.join(ROOT, '..', 'out', 'images', 'First Video from Google Vids.mp4'),
  'dashboard-provided.jpg': path.join(assetsDir, 'dashboard-provided.jpg'),
  'music.mp3': path.join(ROOT, '..', 'remotion', 'public', 'music', 'background.mp3'),
  'narration.mp3': path.join(assetsDir, 'narration.mp3'),
  'bridge.mp3': path.join(assetsDir, 'bridge.mp3'),
};

function prepareAssets() {
  fs.mkdirSync(assetsDir, { recursive: true });
  for (const [name, source] of Object.entries(sourceAssets)) {
    const destination = path.join(assetsDir, name);
    if (!fs.existsSync(source)) {
      console.warn(`  ⚠ Missing asset: ${source} — skipping copy for ${name}`);
      continue;
    }
    if (source !== destination) fs.copyFileSync(source, destination);
  }
}

function encodeVideo() {
  const expectedFrames = DURATION * FPS;
  const frameFiles = fs.readdirSync(framesDir).filter((name) => /^frame-\d{6}\.jpg$/.test(name));
  if (frameFiles.length !== expectedFrames) {
    throw new Error(`Refusing to encode: expected ${expectedFrames} frames, found ${frameFiles.length}`);
  }

  const silent = path.join(outDir, 'reform-hackathon-demo-silent.mp4');
  const final = path.join(outDir, 'reform-hackathon-demo.mp4');

  console.log(`\n🎬 Encoding video: ${FPS}fps, CRF ${crf}, ${DURATION}s`);

  // Step 1: Encode frames to silent video with high quality
  execFileSync('ffmpeg', [
    '-y', '-framerate', String(FPS),
    '-i', path.join(framesDir, 'frame-%06d.jpg'),
    '-c:v', 'libx264',
    '-preset', process.env.VIDEO_PRESET || 'slow',
    '-crf', String(crf),
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-level', '5.1',
    '-movflags', '+faststart',
    '-bf', '2',
    '-g', String(FPS * 2),
    silent,
  ], { stdio: 'inherit' });

  // Step 2: Voice track — the 3-minute cut is pre-assembled (build-voice-3min.js):
  // narration paragraphs re-cut to the narration-alignment cue sheet, so picture/voice
  // stay locked. Just pad it to the 180s timeline (to a temp file — ffmpeg can't
  // overwrite its own input).
  const music = path.join(assetsDir, 'music.mp3');
  const voice = path.join(assetsDir, 'voice-3min.wav');
  const voicePadded = path.join(assetsDir, 'voice-3min-padded.wav');

  if (fs.existsSync(voice)) {
    console.log('🎙  Normalizing voice track...');
    execFileSync('ffmpeg', [
      '-y', '-i', voice,
      '-filter_complex',
      '[0:a]aresample=44100,asetpts=PTS-STARTPTS,apad=pad_dur=180,atrim=duration=180[voice]',
      '-map', '[voice]', '-c:a', 'pcm_s16le', voicePadded,
    ], { stdio: 'inherit' });
  } else {
    throw new Error('Missing assets/voice-3min.wav — run `node build-voice-3min.js` first');
  }

  // Step 3: Mix audio (music bed + voice)
  console.log('🎵  Mixing audio...');
  execFileSync('ffmpeg', [
    '-y', '-i', silent,
    '-stream_loop', '-1', '-i', music,
    '-i', voicePadded,
    '-filter_complex',
    '[1:a]aresample=async=1:first_pts=0,volume=0.065,afade=t=in:st=0:d=3,afade=t=out:st=176:d=4[music];' +
    '[2:a]aresample=async=1:first_pts=0,volume=1.0,afade=t=in:st=0:d=0.25,afade=t=out:st=176:d=4[voice];' +
    '[music][voice]amix=inputs=2:duration=first:dropout_transition=3:normalize=0[a]',
    '-map', '0:v:0', '-map', '[a]',
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k',
    '-metadata', 'title=Reform — Hackathon Demo',
    '-metadata', 'artist=Reform',
    '-metadata', 'comment=Music: Technology Corporate by Aylex via Free To Use',
    '-t', String(DURATION), '-shortest',
    '-movflags', '+faststart',
    final,
  ], { stdio: 'inherit' });

  return final;
}

async function render() {
  console.log('🚀 Reform Demo — HyperFrames Renderer');
  console.log(`   Resolution: ${WIDTH}×${HEIGHT} @ ${FPS}fps`);
  console.log(`   Duration: ${DURATION}s (${DURATION * FPS} frames)`);
  console.log(`   Quality: CRF ${crf}, JPEG ${captureQuality}\n`);

  prepareAssets();

  if (process.env.AUDIO_ONLY === '1') {
    console.log('🔊 Audio-only mode');
    const final = encodeVideo();
    console.log(`\n✅ Wrote ${final}`);
    return;
  }

  if (!resume) fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  // range mode: when resuming a parallel range, drop the highest-numbered frame in this
  // range — it may be a truncated write from a killed run (it will be re-captured).
  if (resume && Number.isFinite(frameEndCap)) {
    const existing = fs.readdirSync(framesDir).filter((name) => /^frame-\d{6}\.jpg$/.test(name)).map((name) => Number(name.slice(6, 12))).filter((n) => n >= frameStart && n <= frameEndCap);
    if (existing.length) {
      const max = Math.max(...existing);
      fs.rmSync(path.join(framesDir, `frame-${String(max).padStart(6, '0')}.jpg`), { force: true });
    }
  }

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (fs.existsSync(defaultChrome) ? defaultChrome : undefined);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  // deterministic + network-independent: only local resources (Google Fonts etc. are
  // aborted — the page falls back to system fonts, same as the probe path).
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = req.url();
    if (u.startsWith('file:') || u.startsWith('data:') || u.startsWith('blob:')) req.continue();
    else req.abort();
  });
  await page.goto(`file://${path.join(ROOT, 'demo.html')}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction('window.__demoReady === true', { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);

  // Pre-warm font rendering
  await page.evaluate(() => {
    document.querySelectorAll('.card-title, .eyebrow, .product-title').forEach(el => {
      el.style.opacity = '1';
    });
  });

  console.log(`\n📸 Rendering frames...\n`);

  const startTime = Date.now();
  const totalFrames = DURATION * FPS;
  const loopEnd = Math.min(totalFrames - 1, frameEndCap);

  for (let frame = frameStart; frame <= loopEnd; frame += 1) {
    const framePath = path.join(framesDir, `frame-${String(frame).padStart(6, '0')}.jpg`);

    if (resume && fs.existsSync(framePath)) continue;

    await page.evaluate((time) => window.__setDemoTime(time), frame / FPS);

    await page.screenshot({
      path: framePath,
      type: 'jpeg',
      quality: captureQuality,
      captureBeyondViewport: false,
    });

    if (frame % FPS === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const sec = Math.round(frame / FPS);
      const fps_rendered = frame / Math.max(0.1, elapsed);
      const remaining = ((totalFrames - frame) / Math.max(1, fps_rendered));
      console.log(`  ${sec}s / ${DURATION}s  (${Math.round(fps_rendered)} fps render speed, ~${Math.round(remaining)}s remaining)`);
    }
  }

  await browser.close();

  const renderTime = ((Date.now() - startTime) / 1000);
  console.log(`\n⏱  Range ${frameStart}-${Math.min(loopEnd, totalFrames - 1)} complete in ${Math.round(renderTime)}s`);

  if (skipEncode) {
    console.log('  SKIP_ENCODE=1 — not encoding');
    return;
  }

  const final = encodeVideo();
  console.log(`\n✅ Wrote ${final}`);
}

render().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
