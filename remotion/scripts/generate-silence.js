/**
 * generate-silence.js
 *
 * Creates a 90-second silent MP3 file at remotion/public/music/background.mp3
 * This is a placeholder so the Remotion render works without a real music file.
 *
 * Run: node remotion/scripts/generate-silence.js
 *
 * To use real music, replace background.mp3 with your actual music file.
 */

const fs = require('fs');
const path = require('path');

// Minimal valid MP3 file: 90 seconds of silence at 128kbps
// This is a valid MP3 frame header for silence
function generateSilentMP3(durationSeconds = 90) {
  // MP3 frame: 4 bytes header + 417 bytes data (128kbps, 44100Hz)
  const frameSize = 417;
  const header = Buffer.from([
    0xff, 0xfb, // Frame sync
    0x90,       // MPEG1, Layer III, no CRC
    0x00,       // 128kbps, 44100Hz, stereo
    0x00, 0x00, 0x00, 0x00, // Frame header padding
  ]);

  // ID3 tag
  const id3 = Buffer.from([
    0x49, 0x44, 0x33, // "ID3"
    0x03, 0x00,       // Version 2.3
    0x00,             // No flags
    0x00, 0x00, 0x00, 0x00, // Size: 0
  ]);

  // Calculate frames needed (44100 samples/sec, 1152 samples/frame)
  const samplesPerFrame = 1152;
  const framesNeeded = Math.ceil((durationSeconds * 44100) / samplesPerFrame);

  const frames = [];
  for (let i = 0; i < framesNeeded; i++) {
    frames.push(header);
    // Silent frame data (all zeros)
    frames.push(Buffer.alloc(frameSize, 0));
  }

  return Buffer.concat([id3, ...frames]);
}

const outputPath = path.join(__dirname, '..', 'public', 'music', 'background.mp3');

// Only generate if file doesn't exist
if (!fs.existsSync(outputPath)) {
  const mp3 = generateSilentMP3(90);
  fs.writeFileSync(outputPath, mp3);
  console.log(`✅ Created silent placeholder: ${outputPath} (${(mp3.length / 1024).toFixed(1)} KB)`);
  console.log('   Replace with your actual music file for the final render.');
} else {
  console.log(`ℹ️  Music file already exists: ${outputPath}`);
  console.log('   To use real music, replace this file with your MP3.');
}
