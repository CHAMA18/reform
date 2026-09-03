const fs = require('fs');
const path = require('path');

// Auto-load ELEVENLABS_API_KEY from .env (repo root or this folder) if not set.
(function loadEnv() {
  if (process.env.ELEVENLABS_API_KEY) return;
  for (const p of [path.join(__dirname, '.env'), path.join(__dirname, '..', '.env')]) {
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^ELEVENLABS_API_KEY\s*=\s*(.+)\s*$/);
      if (m) { process.env.ELEVENLABS_API_KEY = m[1].trim().replace(/^["']|["']$/g, ''); return; }
    }
  }
})();

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error('ELEVENLABS_API_KEY is required (set it in .env or export it)');
  process.exit(1);
}

function extractText(file) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const start = source.indexOf('const text = `') + 'const text = `'.length;
  const end = source.indexOf('`;', start);
  if (start < 'const text = `'.length || end < 0) throw new Error(`Could not extract text from ${file}`);
  return source.slice(start, end);
}

async function align(audioName, scriptFile, outputName) {
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(path.join(__dirname, 'assets', audioName))], { type: 'audio/mpeg' }), audioName);
  form.append('text', extractText(scriptFile));
  const response = await fetch('https://api.elevenlabs.io/v1/forced-alignment', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: form,
  });
  const body = await response.text();
  if (!response.ok) {
    console.error(`Forced alignment failed for ${audioName}: ${response.status} ${body}`);
    process.exit(1);
  }
  const output = path.join(__dirname, 'assets', outputName);
  fs.writeFileSync(output, body);
  console.log(`Wrote ${output}`);
}

(async () => {
  await align('narration.mp3', 'generate-narration.js', 'narration-alignment.json');
  await align('bridge.mp3', 'generate-bridge.js', 'bridge-alignment.json');
})().catch((error) => { console.error(error); process.exit(1); });
