#!/usr/bin/env python3
"""
Reform — Local Whisper ASR Server
=================================

A lightweight HTTP server that transcribes audio using faster-whisper.
Compatible with Reform's voice-first submission mode.

Endpoints:
  POST /v1/audio/transcriptions  — OpenAI-compatible endpoint
  POST /inference                 — Whisper.cpp-compatible endpoint
  GET  /health                    — Health check

Usage:
  python scripts/whisper-server.py                     # Default: base model, port 9000
  python scripts/whisper-server.py --model base        # Specify model
  python scripts/whisper-server.py --port 8080         # Custom port
  python scripts/whisper-server.py --device cpu         # Force CPU

Supported models: tiny, base, small, medium, large-v3
Default: base (fast, ~1GB, good accuracy)

Requirements:
  pip install faster-whisper flask
"""

import argparse
import io
import os
import sys
import time
import tempfile
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

# ---------------------------------------------------------------------------
# Whisper model (lazy-loaded)
# ---------------------------------------------------------------------------

_model = None
_model_name = None

def get_model(model_name: str = "base"):
    global _model, _model_name
    if _model is not None and _model_name == model_name:
        return _model

    print(f"Loading Whisper model: {model_name}...")
    start = time.time()

    from faster_whisper import WhisperModel

    # Use CPU by default (works everywhere). Set device="cuda" for GPU.
    device = os.environ.get("WHISPER_DEVICE", "cpu")
    compute_type = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")

    _model = WhisperModel(model_name, device=device, compute_type=compute_type)
    _model_name = model_name

    elapsed = time.time() - start
    print(f"  Model loaded in {elapsed:.1f}s (device={device}, compute={compute_type})")
    return _model


def transcribe_audio(audio_bytes: bytes, language: str = None) -> dict:
    """Transcribe audio bytes and return result dict."""
    model = get_model()

    # Write to temp file (faster-whisper needs a file path)
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        start = time.time()
        segments, info = model.transcribe(
            tmp_path,
            language=language,
            beam_size=5,
            vad_filter=True,  # Voice Activity Detection — skips silence
        )

        # Collect all segments
        text_parts = []
        for segment in segments:
            text_parts.append(segment.text.strip())

        elapsed_ms = int((time.time() - start) * 1000)
        full_text = " ".join(text_parts).strip()

        return {
            "text": full_text,
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "duration": round(info.duration, 2),
            "latency_ms": elapsed_ms,
        }
    finally:
        os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# HTTP Server
# ---------------------------------------------------------------------------

class WhisperHandler(BaseHTTPRequestHandler):
    """Handle HTTP requests for Whisper ASR."""

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ok",
                "model": _model_name or "not_loaded",
                "device": os.environ.get("WHISPER_DEVICE", "cpu"),
            }).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path in ("/v1/audio/transcriptions", "/inference"):
            self._handle_transcription()
        else:
            self.send_response(404)
            self.end_headers()

    def _handle_transcription(self):
        try:
            content_type = self.headers.get("Content-Type", "")
            language = None

            if "multipart/form-data" in content_type:
                # Parse multipart form data
                boundary = content_type.split("boundary=")[1].encode()
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length)

                parts = body.split(b"--" + boundary)
                audio_bytes = None

                for part in parts:
                    if b"filename=" in part or b"name=\"file\"" in part:
                        # Extract the file data (after the double CRLF)
                        header_end = part.find(b"\r\n\r\n")
                        if header_end != -1:
                            file_data = part[header_end + 4:]
                            # Remove trailing CRLF
                            if file_data.endswith(b"\r\n"):
                                file_data = file_data[:-2]
                            audio_bytes = file_data
                    elif b'name="model"' in part:
                        header_end = part.find(b"\r\n\r\n")
                        if header_end != -1:
                            pass  # model name in form field, we use our configured model
                    elif b'name="language"' in part:
                        header_end = part.find(b"\r\n\r\n")
                        if header_end != -1:
                            lang = part[header_end + 4:].decode().strip()
                            if lang and lang != "auto":
                                language = lang

                if audio_bytes is None or len(audio_bytes) < 100:
                    self._send_error(400, "No audio data found in request")
                    return

                result = transcribe_audio(audio_bytes, language)

                # OpenAI-compatible response format
                if self.path == "/v1/audio/transcriptions":
                    response = {"text": result["text"]}
                else:
                    response = result

                self._send_json(200, response)

            elif "application/json" in content_type:
                # JSON body with base64 audio
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length)
                data = json.loads(body)

                audio_b64 = data.get("file_base64") or data.get("audio")
                if not audio_b64:
                    self._send_error(400, "No audio data in JSON body")
                    return

                import base64
                audio_bytes = base64.b64decode(audio_b64)
                result = transcribe_audio(audio_bytes, language)
                self._send_json(200, {"text": result["text"]})

            else:
                self._send_error(400, f"Unsupported content type: {content_type}")

        except Exception as e:
            print(f"Error: {e}")
            self._send_error(500, str(e))

    def _send_json(self, status: int, data: dict):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _send_error(self, status: int, message: str):
        self._send_json(status, {"error": message})

    def log_message(self, format, *args):
        # Custom log format with timestamps
        timestamp = time.strftime("%H:%M:%S")
        sys.stderr.write(f"[{timestamp}] {format % args}\n")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Reform Whisper ASR Server")
    parser.add_argument("--model", default="base", help="Whisper model (tiny/base/small/medium/large-v3)")
    parser.add_argument("--port", type=int, default=9000, help="Server port (default: 9000)")
    parser.add_argument("--host", default="0.0.0.0", help="Server host (default: 0.0.0.0)")
    parser.add_argument("--device", default="cpu", help="Device: cpu or cuda (default: cpu)")
    args = parser.parse_args()

    # Set device before model loading
    os.environ["WHISPER_DEVICE"] = args.device

    print("=" * 50)
    print("  Reform — Local Whisper ASR Server")
    print("=" * 50)
    print()
    print(f"  Model:  {args.model}")
    print(f"  Device: {args.device}")
    print(f"  Port:   {args.port}")
    print()

    # Pre-load the model
    get_model(args.model)

    print()
    print(f"  Listening on http://{args.host}:{args.port}")
    print()
    print("  Endpoints:")
    print(f"    POST /v1/audio/transcriptions  (OpenAI-compatible)")
    print(f"    POST /inference                 (Whisper.cpp-compatible)")
    print(f"    GET  /health                    (Health check)")
    print()
    print("  Test with:")
    print(f"    curl -X POST http://localhost:{args.port}/v1/audio/transcriptions \\")
    print(f"      -F file=@audio.webm")
    print()

    # Start server
    server = HTTPServer((args.host, args.port), WhisperHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()


if __name__ == "__main__":
    main()
