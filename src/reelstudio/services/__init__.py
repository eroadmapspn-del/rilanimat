"""Use cases. Each service does one stage of the pipeline; the API layer only calls these."""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from ..config import Settings
from ..jobs import JobRunner
from ..media import remotion
from ..providers import build_providers
from ..providers.base import ScriptWriter, StoryWriter, VoiceSynth
from ..storage import ProjectRepository
from .context import Context
from .projects import ProjectService
from .reel import ReelService
from .scenes import SceneService
from .script import ScriptService
from .story import StoryService
from .voice import VoiceService


@dataclass
class Services:
    ctx: Context
    projects: ProjectService
    story: StoryService
    script: ScriptService
    voice: VoiceService
    scenes: SceneService
    reel: ReelService


def build_services(
    settings: Settings,
    *,
    script_writer: ScriptWriter | None = None,
    voice_synth: VoiceSynth | None = None,
    story_writer: StoryWriter | None = None,
    renderer: Callable | None = None,
    synchronous: bool = False,
) -> Services:
    """Wire the app together. Tests pass fakes; production passes nothing."""
    repo = ProjectRepository(settings.data_dir)
    default_writer, default_voice, default_story = build_providers(settings)

    def on_error(pid: str, kind: str, exc: Exception) -> None:
        repo.log(pid, f"ERROR in {kind}: {exc}")
        if kind in ("story", "script", "voice", "final"):
            def mark(p: dict) -> None:
                p[kind]["status"] = "error"
                p[kind]["error"] = str(exc)[:600]
            repo.update(pid, mark)

    ctx = Context(
        settings=settings,
        repo=repo,
        jobs=JobRunner(on_error, synchronous=synchronous),
        script_writer=script_writer or default_writer,
        voice_synth=voice_synth or default_voice,
        story_writer=story_writer or default_story,
        renderer=renderer or remotion.render,
    )
    return Services(
        ctx, ProjectService(ctx), StoryService(ctx), ScriptService(ctx), VoiceService(ctx), SceneService(ctx), ReelService(ctx),
    )
