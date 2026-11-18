"""External services behind small interfaces, so they can be swapped or faked."""
from __future__ import annotations

from ..config import Settings
from .base import ScriptWriter, StoryWriter, VoiceSynth


def build_providers(settings: Settings) -> tuple[ScriptWriter, VoiceSynth, StoryWriter]:
    if settings.provider == "fake":
        from .fake import FakeScriptWriter, FakeStoryWriter, FakeVoiceSynth

        return FakeScriptWriter(), FakeVoiceSynth(), FakeStoryWriter()
    from .gemini import GeminiScriptWriter, GeminiStoryWriter, GeminiVoiceSynth

    return GeminiScriptWriter(settings), GeminiVoiceSynth(settings), GeminiStoryWriter(settings)
