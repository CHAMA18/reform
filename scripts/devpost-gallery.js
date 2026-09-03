/* devpost-gallery.js — build the Devpost "Project Media" image gallery.
 * Outputs 3:2 (1920x1280) JPEGs on the brand dark, sized for Devpost (5MB max, 15 max).
 * Run: node scripts/devpost-gallery.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'devpost-gallery');
const W = 1920;
const H = 1280; // 3:2
const BG = '#0a0908';

const SHOTS = [
  ['01-cover', 'remotion/out/preview-hack/title-6s.png', 'Reform — opening title from the demo film'],
  ['02-landing', 'remotion/public/reform-assets/landing.png', 'Reform — product entry'],
  ['03-dashboard', 'reform-hyperframes/app-shots/dashboard.png', 'Command center — live forms, submissions, AI activity'],
  ['04-ai-generator', 'reform-hyperframes/app-shots/ai-gen.png', 'AI Form Generator — prompt to validated structure'],
  ['05-flowchart-builder', 'reform-hyperframes/app-shots/builder.png', 'Flowchart Builder — visible logic, conditional branches'],
  ['06-conversational', 'reform-hyperframes/app-shots/chat.png', 'Conversational mode — one question at a time'],
  ['07-voice', 'reform-hyperframes/app-shots/voice.png', 'Voice mode — answer hands-free'],
  ['08-translation', 'reform-hyperframes/app-shots/translate.png', 'Auto-translation — every visitor in their language'],
  ['09-routing', 'reform-hyperframes/app-shots/routing.png', 'Smart routing — plain-English rules'],
  ['10-submissions', 'reform-hyperframes/app-shots/submissions.png', 'Submissions — every response becomes signal'],
  ['11-analytics', 'reform-hyperframes/app-shots/analytics.png', 'Drop-off analytics — AI names the problem and the fix'],
  ['12-api-keys', 'reform-hyperframes/app-shots/api-keys.png', 'REST API keys — scoped, rotatable, for developers'],
  ['13-brand', 'remotion/out/preview-demo/f5200.png', 'Reform — end card from the demo film'],
  ['14-film-frame', 'remotion/out/preview-hack/chat-92s.png', 'A frame from the 3-minute cinematic'],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = [];
  for (const [slug, rel, caption] of SHOTS) {
    const src = path.join(ROOT, rel);
    const out = path.join(OUT, `${slug}.jpg`);
    const img = sharp(src);
    const meta = await img.metadata();
    // fit-contain the source inside 1920x1280 on the brand dark (never crops UI)
    const scale = Math.min(W / meta.width, H / meta.height);
    const w = Math.round(meta.width * scale);
    const h = Math.round(meta.height * scale);
    await sharp({ create: { width: W, height: H, channels: 3, background: BG } })
      .composite([{ input: await img.resize(w, h, { fit: 'fill' }).toBuffer(), left: Math.round((W - w) / 2), top: Math.round((H - h) / 2) }])
      .jpeg({ quality: 90, mozjpeg: true })
      .toFile(out);
    const kb = Math.round(fs.statSync(out).size / 1024);
    manifest.push([slug, `${w}x${h} in ${W}x${H}`, `${kb}KB`, caption]);
    console.log(`✅ ${slug}.jpg — ${kb}KB`);
  }
  fs.writeFileSync(path.join(OUT, 'manifest.txt'), manifest.map((m) => m.join('\t')).join('\n'));
  console.log(`\n${manifest.length} images → ${OUT}`);
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });