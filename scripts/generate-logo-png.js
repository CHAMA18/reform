/**
 * generate-logo-png.js — Rasterize the official Reform logo SVGs into PNGs.
 *
 *   mark:   public/logo.svg          (64x64 mark only)      -> reform-mark.png     1024x1024
 *   lockup: public/logo-full.svg     (320x80 mark+wordmark) -> reform-lockup.png   1280x320 (dark text, light bg)
 *   dark:   public/logo-full.svg     (white wordmark)       -> reform-lockup-dark.png (for dark backgrounds)
 *
 * Run: node scripts/generate-logo-png.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const svgMark = fs.readFileSync(path.join(ROOT, 'public', 'logo.svg'), 'utf8');
const svgLockup = fs.readFileSync(path.join(ROOT, 'public', 'logo-full.svg'), 'utf8');

const injectSize = (svg, w, h) => svg.replace('<svg', `<svg width="${w}" height="${h}"`);
const darkLockup = svgLockup.replace(/fill="#0c0a09"/g, 'fill="#ffffff"');

const TARGETS = [
  ['public/reform-mark.png', injectSize(svgMark, 1024, 1024), 1024, 1024],
  ['public/reform-lockup.png', injectSize(svgLockup, 1280, 320), 1280, 320],
  ['public/reform-lockup-dark.png', injectSize(darkLockup, 1280, 320), 1280, 320],
];

async function main() {
  for (const [out, svg, w, h] of TARGETS) {
    const outPath = path.join(ROOT, out);
    await sharp(Buffer.from(svg)).resize(w, h).png().toFile(outPath);
    console.log('Wrote', outPath);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });