"""What every service needs, bundled so services stay small."""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from ..config import Settings
from ..jobs import JobRunner
from ..providers.base import ScriptWriter, StoryWriter, VoiceSynth
from ..storage import ProjectRepository


@dataclass
class Context:
    settings: Settings
    repo: ProjectRepository
    jobs: JobRunner
    script_writer: ScriptWriter
    voice_synth: VoiceSynth
    story_writer: StoryWriter
    renderer: Callable  # media.remotion.render, or a fake in tests

    def log(self, pid: str, message: str) -> None:
        self.repo.log(pid, message)
