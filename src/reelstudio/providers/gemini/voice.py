"""One continuous voice-over with Gemini text-to-speech."""
from __future__ import annotations

import wave
from pathlib import Path

from ...config import Settings
from ..base import Log
from .client import make_client, with_retry


class GeminiVoiceSynth:
    def __init__(self, settings: Settings):
        self.settings = settings

    def synthesize(self, text: str, style: str, voice: str, out_path: Path, log: Log) -> float:
        client = make_client(self.settings)
        model = self.settings.tts_model
        log(f"Generating voice-over with {model} ({voice})...")

        def call() -> bytes:
            response = client.models.generate_content(
                model=model,
                contents=[{"role": "user", "parts": [{"text": text, "speech_metadata": {"style": style}}]}],
                config={"response_modalities": ["AUDIO"], "speech_config": {"voice_config": {"voice": voice}}},
            )
            return response.candidates[0].content.parts[0].inline_data.data

        data = with_retry(call, log)
        if data[:4] == b"RIFF":
            out_path.write_bytes(data)
        else:  # raw 16-bit PCM, mono, 24 kHz
            with wave.open(str(out_path), "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(24000)
                wf.writeframes(data)
        with wave.open(str(out_path), "rb") as wf:
            return wf.getnframes() / wf.getframerate()
