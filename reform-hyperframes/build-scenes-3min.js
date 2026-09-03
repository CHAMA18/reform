/* build-scenes-3min.js — assemble the 3-minute voice track from freshly generated
 * narration.mp3 + bridge.mp3 and derive scene boundaries from the measured
 * word-level alignments, so visuals switch exactly when each narration line starts.
 *
 * Run (after generate-narration.js, generate-bridge.js, align-audio.js):
 *   node build-scenes-3min.js
 *
 * Emits:
 *   assets/voice-3min.wav        narration + 0.45s gap + bridge, trimmed to last word
 *   assets/scenes-3min.json      full measured scene table (consumed by the Remotion twin)
 *   assets/scenes-times.js       window.__SCENES_TIMES (consumed by demo.html)
 *   ../remotion/src/scenes-3min.json  copy for the Remotion composition
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, 'assets');
const TMP = path.join(ASSETS, '3min-tmp');
const TOTAL = 180;
const TAIL = 0.3;          // keep a little room after the last word
const GAP = 0.45;          // natural pause between narration and bridge

const extractText = (file) => {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const start = source.indexOf('const text = `') + 'const text = `'.length;
  const end = source.indexOf('`;', start);
  if (start < 'const text = `'.length || end < 0) throw new Error(`Could not extract text from ${file}`);
  return source.slice(start, end);
};

// Map normalized string index -> alignment character index.
// Both sides are stripped of punctuation so "Alpha one two." matches "Alpha one two".
const normMap = (chars) => {
  let norm = '';
  const map = [];
  for (let i = 0; i < chars.length; i++) {
    const t = chars[i].text;
    for (const ch of t) {
      if (ch === '\r' || /[.,:;!?—–'"()]/.test(ch)) continue;
      norm += ch;
      map.push(i);
    }
  }
  return { norm, map };
};

// Start time (seconds) of each paragraph in the script, measured from the alignment.
const paragraphStarts = (align, scriptText) => {
  const chars = align.characters || [];
  const { norm, map } = normMap(chars);
  const paras = scriptText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const starts = [];
  for (const para of paras) {
    const words = para.split(/\s+/).filter(Boolean);
    let needle = '';
    let ni = -1;
    for (let k = 5; k >= 2 && ni < 0; k--) {
      needle = words.slice(0, k).join(' ').replace(/[.,:;!?—–'"()]/g, '');
      ni = norm.indexOf(needle);
    }
    if (ni < 0) throw new Error(`Could not locate paragraph in alignment: "${para.slice(0, 40)}..."`);
    starts.push(chars[map[ni]].start);
  }
  return starts;
};

const lastWordEnd = (align) => {
  const words = (align.words || []).filter((w) => w.text && w.text.trim());
  const chars = align.characters || [];
  if (words.length) return Math.max(words[words.length - 1].end, chars[chars.length - 1]?.end || 0);
  return chars[chars.length - 1]?.end || 0;
};

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

const nAlign = JSON.parse(fs.readFileSync(path.join(ASSETS, 'narration-alignment.json'), 'utf8'));
const bAlign = JSON.parse(fs.readFileSync(path.join(ASSETS, 'bridge-alignment.json'), 'utf8'));

const narrationDur = lastWordEnd(nAlign) + TAIL;
const bridgeDur = lastWordEnd(bAlign) + TAIL;
const starts = paragraphStarts(nAlign, extractText('generate-narration.js'));
console.log(`narration: ${narrationDur.toFixed(3)}s (${starts.length} paragraphs), bridge: ${bridgeDur.toFixed(3)}s`);

// Cut both pieces and concat narration + gap + bridge -> voice-3min.wav
for (const [name, dur] of [['narration', narrationDur], ['bridge', bridgeDur]]) {
  execFileSync('ffmpeg', [
    '-y', '-ss', '0', '-t', dur.toFixed(3), '-i', path.join(ASSETS, `${name}.mp3`),
    '-vn', '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2', path.join(TMP, `${name}.wav`),
  ], { stdio: 'ignore' });
}
const gapFile = path.join(TMP, 'gap.wav');
execFileSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo`, '-t', GAP.toFixed(3), gapFile], { stdio: 'ignore' });
const listFile = path.join(TMP, 'list.txt');
fs.writeFileSync(listFile, [path.join(TMP, 'narration.wav'), gapFile, path.join(TMP, 'bridge.wav')].map((f) => `file '${f}'`).join('\n'));
const voiceOut = path.join(ASSETS, 'voice-3min.wav');
execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', voiceOut], { stdio: 'ignore' });
let voiceDur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', voiceOut], { encoding: 'utf8' }).trim());

// Safety net: if the read runs long, apply a gentle uniform speed-up (atempo) so the
// 3:00 timeline always fits, and scale every measured scene time by the same factor.
// Kept imperceptible (<=1.04); hard-fails only if even 1.12x wouldn't fit.
const TARGET_OUTRO = 18;
const MAX_FACTOR = 1.12;
let factor = voiceDur / (TOTAL - TARGET_OUTRO);
if (factor > MAX_FACTOR) {
  throw new Error(`Voice track is ${voiceDur.toFixed(1)}s — too long to fit 3:00 even at ${MAX_FACTOR}x. Trim the narration script (target <= ${((TOTAL - TARGET_OUTRO) * MAX_FACTOR).toFixed(0)}s of speech).`);
}
if (factor > 1.001) {
  const tmp = path.join(ASSETS, 'voice-3min-raw.wav');
  fs.renameSync(voiceOut, tmp);
  execFileSync('ffmpeg', ['-y', '-i', tmp, '-filter:a', `atempo=${factor.toFixed(4)}`, '-c:a', 'pcm_s16le', voiceOut], { stdio: 'ignore' });
  fs.rmSync(tmp, { force: true });
  voiceDur /= factor;
  console.log(`⚠ narration ran long — applied ${factor.toFixed(3)}x speed-up, scene times scaled`);
} else {
  factor = 1;
}

// Scene table: paragraph i covers [starts[i], starts[i+1]); last scene ends at voiceDur.
const ids = ['title', 'montage', 'dashboard', 'gen-prompt', 'generator', 'builder', 'chat',
  'voice-translate', 'submissions', 'metrics', 'analytics', 'mosaic', 'invitation', 'end'];
const scaled = starts.map((s) => s / factor);
const scenes = scaled.map((s, i) => {
  const end = i + 1 < scaled.length ? scaled[i + 1] : voiceDur;
  return { id: ids[i], start: Math.round(s * 1000) / 1000, end: Math.round(end * 1000) / 1000 };
});

// Balance the outro: end card + Remotion credit inside the remaining time.
const outro = TOTAL - voiceDur;
const credit = Math.min(9, Math.max(6, Math.round((outro - 6) * 10) / 10));
const card = Math.round((outro - credit) * 10) / 10;
if (card < 6) console.warn(`⚠ outro is tight: card ${card.toFixed(1)}s + credit ${credit.toFixed(1)}s — consider trimming the script further`);
scenes.push({ id: 'end', start: Math.round(voiceDur * 1000) / 1000, end: TOTAL, creditAt: Math.round((voiceDur + card) * 10) / 10 });

const out = {
  voiceFile: 'assets/voice-3min.wav',
  voiceDuration: voiceDur,
  total: TOTAL,
  outro,
  cardDuration: card,
  creditDuration: credit,
  scenes,
};

fs.writeFileSync(path.join(ASSETS, 'scenes-3min.json'), JSON.stringify(out, null, 2));
// demo.html consumes a plain JS file (script tag works on file://).
fs.writeFileSync(path.join(ASSETS, 'scenes-times.js'),
  `// generated by build-scenes-3min.js — measured scene boundaries from the voice track\n` +
  `window.__SCENES_TIMES = ${JSON.stringify(scenes)};\n`);
// Remotion twin imports the JSON synchronously.
fs.copyFileSync(path.join(ASSETS, 'scenes-3min.json'), path.join(__dirname, '..', 'remotion', 'src', 'scenes-3min.json'));

console.log(`voice: ${voiceOut} (${voiceDur.toFixed(3)}s), outro: ${outro.toFixed(1)}s (card ${card}s + credit ${credit}s)`);
console.log('scene table:', JSON.stringify(scenes, null, 1));
fs.rmSync(TMP, { recursive: true, force: true });