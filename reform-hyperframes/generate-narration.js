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
// One paragraph per scene, in scene order — written to land at ~2.7 words/sec so the
// ~13 narration scenes fill ~150s (measured: the previous read ran 2.66 wps). Scene
// boundaries are measured from the alignment afterwards (build-scenes-3min.js), and
// build-scenes-3min.js applies a gentle speed-up if the read still runs long.
const text = `Most forms are treated like documents. A box to fill in, a button to press, and a spreadsheet no one wants to read. But a form is the first conversation between a team and the people it serves.

Reform turns the form into a living workflow — not a nicer page, but a system that understands intent and gives every team a clear next move.

This is the Reform workspace. At a glance you see what is live, what is moving, where attention is needed. Forms, submissions, completion, AI activity — one operating picture, ready the moment you open it.

A strong workflow begins with a strong question. So build one from intent. Describe an NPS survey in plain English — name, email, a zero-to-ten rating, a category, comments. Say what it should do; Reform handles the scaffolding.

This is the AI Form Generator. The prompt is the brief. Reform turns that sentence into real structure: fields, options, validation, a publishable flow.

Generated forms must be able to evolve. This is the visual builder — logic visible before it goes live. Ask for an email, branch into the rating, submit, store, route. Every decision can be inspected, edited, explained. The flow is the product.

Now look at the person on the other side. Not everyone wants the same interface — the same workflow can become a natural conversation, one question at a time. Reform gives it more than one way to meet a person.

The same structure can become a voice interaction, hands-free, or a localized experience in the language your audience speaks. Less friction for them, better signal for you.

Once responses arrive, Reform closes the loop. Submissions are not a graveyard of answers — they are a live stream of context. See what people said, which forms perform, and move from response to decision.

The workspace makes that signal legible — completion rate, AI opportunities, routed teams, funnel health, at a glance.

A drop-off becomes an opportunity. A repeated request becomes a routing rule. A response becomes the beginning of action.

Underneath the calm interface is an AI-native foundation — generator, visual logic, conversation, voice, translation, routing, analytics, developer access. One platform, every piece designed to work as one system.

Start with intent. Make logic visible. Let people respond naturally. Understand the signal. Improve the next experience. Reform is not another tool — it is the center of gravity for the work you already do.`;

async function generate() {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.48,
        similarity_boost: 0.82,
        style: 0.28,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    console.error(`ElevenLabs request failed: ${response.status} ${await response.text()}`);
    process.exit(1);
  }

  const output = path.join(__dirname, 'assets', 'narration.mp3');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, Buffer.from(await response.arrayBuffer()));
  console.log(`Wrote ${output}`);
}

generate().catch((error) => {
  console.error(error);
  process.exit(1);
});