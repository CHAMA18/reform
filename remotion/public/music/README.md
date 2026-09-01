# Background Music

Place your music file here as `background.mp3`.

## Recommended Music

For a cinematic tech product video like Reform, look for:

- **Genre**: Cinematic electronic, ambient tech, modern orchestral
- **Mood**: Inspiring, forward-moving, professional
- **Tempo**: 100-120 BPM (matches the video's pacing)
- **Duration**: 90+ seconds (video loops shorter tracks)

## Free Music Sources

- [Pixabay Music](https://pixabay.com/music/) — Free, no attribution required
- [Uppbeat](https://uppbeat.io/) — Free for creators
- [Mixkit](https://mixkit.co/free-stock-music/) — Free stock music
- [YouTube Audio Library](https://studio.youtube.com/channel/audio) — Free for YouTube

## Search Terms

Try searching for: "cinematic technology", "inspiring corporate", "modern innovation", "startup motivation", "tech presentation"

## Setup

1. Download an MP3 file
2. Rename it to `background.mp3`
3. Place it in this directory
4. Re-render the video:
   ```bash
   npx remotion render remotion/src/index.ts ReformCinematic out/reform-cinematic.mp4 --codec=h264 --crf=18
   ```

## Volume Envelope

The video uses a cinematic volume envelope that automatically adjusts:

| Scene | Time | Volume | Effect |
|-------|------|--------|--------|
| The Void | 0-5s | 0→0.25 | Atmospheric fade in |
| The Chaos | 5-15s | 0.25→0.5 | Building tension |
| The Vision | 15-25s | 0.2→0.5 | Hopeful swell at reveal |
| The Power | 25-50s | 0.5→0.55 | Full energy |
| The Impact | 50-65s | 0.35→0.5 | Pulled back for numbers |
| The Foundation | 65-75s | 0.45→0.5 | Steady |
| The Close | 75-90s | 0.55→0 | Final swell + fade out |

Override with custom envelope in `BackgroundMusic.tsx`.
