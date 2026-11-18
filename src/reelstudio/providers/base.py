"""The two things the app asks an AI service to do."""
from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import Protocol

Log = Callable[[str], None]


class StoryWriter(Protocol):
    def write(self, brief: dict, previous: dict | None, feedback: str, log: Log) -> dict:
        """Return {title, logline, full_story, reel_cut}. `previous` + `feedback` are set when revising."""


class ScriptWriter(Protocol):
    def write(self, brief: dict, image_names: list[str], log: Log) -> dict:
        """Return {title, voice_style, scenes: [...], caption, hashtags}."""


class VoiceSynth(Protocol):
    def synthesize(self, text: str, style: str, voice: str, out_path: Path, log: Log) -> float:
        """Write a WAV file to out_path and return its length in seconds."""
