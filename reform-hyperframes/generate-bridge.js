const fs = require('fs');
const path = require('path');

// Auto-load ELEVENLABS_API_KEY from .env (repo root or this folder) if not set.
function loadEnv() {
  if (process.env.ELEVENLABS_API_KEY) return;
  for (const p of [path.join(__dirname, '.env'), path.join(__dirname, '..', '.env')]) {
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^ELEVENLABS_API_KEY\s*=\s*(.+)\s*$/);
      if (m) { process.env.ELEVENLABS_API_KEY = m[1].trim().replace(/^["']|["']$/g, ''); return; }
    }
  }
}
loadEnv();

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error('ELEVENLABS_API_KEY is required (set it in .env or export it)');
  process.exit(1);
}

const voiceId = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
// Closing invitation — plays over the end card and into the Remotion credit (~12-14s).
const text = `So when the next customer, teammate, or community member has something to say, give that conversation a better place to begin. This is Reform. Build the experience. Understand the signal. Move faster with one intelligent workflow.`;

async function generate() {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.48, similarity_boost: 0.82, style: 0.28, use_speaker_boost: true },
    }),
  });
  if (!response.ok) {
    console.error(`ElevenLabs request failed: ${response.status} ${await response.text()}`);
    process.exit(1);
  }
  const output = path.join(__dirname, 'assets', 'bridge.mp3');
  fs.writeFileSync(output, Buffer.from(await response.arrayBuffer()));
  console.log(`Wrote ${output}`);
}

generate().catch((error) => { console.error(error); process.exit(1); });