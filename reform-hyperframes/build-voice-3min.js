/* build-voice-3min.js — cut the existing narration into a tight ~160s voice track for the 3-minute cut.
 *
 * Keeps the on-point paragraphs, splices out "In the next four minutes, you will see the complete loop:",
 * trims the closing tail silence, and emits assets/scenes-3min.json with scene boundaries measured
 * from the actual audio so visuals switch exactly when each narration line starts.
 *
 * Run: node build-voice-3min.js   (requires ffmpeg in PATH)
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, 'assets');
const TMP = path.join(ASSETS, '3min-tmp');
const narration = path.join(ASSETS, 'narration.mp3');
const bridge = path.join(ASSETS, 'bridge.mp3');

// cut pieces: [src, in, out] in seconds
const narrationPieces = [
  ['narration.mp3', 0.100, 12.270],                       // p1 opening
  ['narration.mp3', 12.270, 15.970],                       // p2 part A (…clear next move.)
  ['narration.mp3', 18.670, 25.540],                       // p2 part B (Start with an idea… action.)
  ['narration.mp3', 25.540, 43.340],                       // p3 workspace
  ['narration.mp3', 43.340, 57.990],                       // p4 start with intent
  ['narration.mp3', 57.990, 66.770],                       // p5 AI form generator
  ['narration.mp3', 66.770, 88.340],                       // p6 visual builder
  ['narration.mp3', 94.810, 108.870],                      // p8 conversational
  ['narration.mp3', 108.870, 118.210],                     // p9 voice + translation
  ['narration.mp3', 118.210, 133.140],                     // p10 submissions
  ['narration.mp3', 133.140, 139.080],                     // p11 signal / metrics
  ['narration.mp3', 139.080, 145.590],                     // p12 analytics / drop-off
  ['narration.mp3', 145.590, 155.480],                     // p13 one platform
];

// bridge closing line — trim trailing silence after the last aligned word.
// bridge-alignment.json timestamps are relative to the bridge file (which starts at 170.945s
// in the old 4-minute timeline), so cut in bridge-local time.
const BRIDGE_LOCAL_OFFSET = 170.945;
const bAlign = JSON.parse(fs.readFileSync(path.join(ASSETS, 'bridge-alignment.json'), 'utf8'));
const bWords = (bAlign.words || []).filter((w) => w.text && w.text.trim());
const bEndLocal = bWords.length ? bWords[bWords.length - 1].end : 45.5;
const b3StartLocal = 202.965 - BRIDGE_LOCAL_OFFSET; // 32.020
const b3OutLocal = Math.min(46.068, bEndLocal + 0.45);

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

const pieces = [...narrationPieces, ['bridge.mp3', b3StartLocal, b3OutLocal]];
const pieceFiles = [];
const durations = [];

for (let i = 0; i < pieces.length; i++) {
  const [src, inSec, outSec] = pieces[i];
  const outFile = path.join(TMP, `piece-${String(i).padStart(2, '0')}.wav`);
  execFileSync('ffmpeg', [
    '-y', '-ss', inSec.toFixed(3), '-to', outSec.toFixed(3), '-i', path.join(ASSETS, src),
    '-vn', '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2', outFile,
  ], { stdio: 'ignore' });
  pieceFiles.push(outFile);
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', outFile], { encoding: 'utf8' }).trim());
  durations.push(dur);
  console.log(`piece ${i} [${src} ${inSec}-${outSec}] = ${dur.toFixed(3)}s`);
}

const listFile = path.join(TMP, 'list.txt');
fs.writeFileSync(listFile, pieceFiles.map((f) => `file '${f}'`).join('\n'));

const voiceOut = path.join(ASSETS, 'voice-3min.wav');
execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', voiceOut], { stdio: 'ignore' });
const voiceDur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', voiceOut], { encoding: 'utf8' }).trim());

// scene table: paragraphs become scenes; p2 was split into two audio pieces (1+2) that
// belong to one scene, so group piece indices: [0], [1,2], [3..13]
const groups = [[0], [1, 2], [3], [4], [5], [6], [7], [8], [9], [10], [11], [12], [13]];
const pieceStarts = [0];
for (let i = 0; i < durations.length; i++) pieceStarts.push(pieceStarts[i] + durations[i]);

const TOTAL = 180;
const outro = TOTAL - voiceDur;
const cardDur = Math.max(9, Math.round((outro - 9) * 10) / 10);
const creditDur = Math.round((outro - cardDur) * 10) / 10;
const cardStart = voiceDur;

const ids = ['title', 'montage', 'dashboard', 'gen-prompt', 'generator', 'builder', 'chat', 'voice-translate', 'submissions', 'metrics', 'analytics', 'mosaic', 'invitation', 'end'];
const scenes = groups.map((g, i) => {
  const start = pieceStarts[g[0]];
  const end = pieceStarts[g[g.length - 1] + 1];
  if (ids[i] === 'end') return { id: ids[i], start: cardStart, end: TOTAL, creditAt: Math.round((cardStart + cardDur) * 10) / 10 };
  return { id: ids[i], start, end };
});

const out = {
  voiceFile: 'assets/voice-3min.wav',
  voiceDuration: voiceDur,
  total: TOTAL,
  outro,
  cardDuration: cardDur,
  creditDuration: creditDur,
  scenes,
};
fs.writeFileSync(path.join(ASSETS, 'scenes-3min.json'), JSON.stringify(out, null, 2));
console.log('\nvoice:', voiceOut, `(${voiceDur.toFixed(3)}s)`);
console.log('scene table:', JSON.stringify(scenes, null, 1));
fs.rmSync(TMP, { recursive: true, force: true });