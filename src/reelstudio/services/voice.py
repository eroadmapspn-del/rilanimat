"""Stage 2: one continuous voice-over, generated or uploaded."""
from __future__ import annotations

import time
from pathlib import Path

from werkzeug.utils import secure_filename

from ..domain.project import VOICES, max_voice_seconds
from ..domain.workflow import require_approved, reset_downstream
from ..errors import InvalidInput, InvalidMedia, WorkflowError
from ..media import ffmpeg
from .context import Context

DEFAULT_STYLE = "Natural, warm, friendly, like a real person talking to a friend. Not a whisper, not an announcer, not robotic."


def _length_note(seconds: float, limit: float) -> str:
    if seconds <= limit + 0.5:
        return ""
    return f" (longer than {limit:.0f}s: the reel will pass {limit + 3:.0f}s, consider shortening)"


class VoiceService:
    def __init__(self, ctx: Context):
        self.ctx = ctx

    def generate(self, pid: str, voice: str | None) -> bool:
        repo = self.ctx.repo
        project = repo.load(pid)
        require_approved(project, "script")
        voice = voice or VOICES[0]
        if voice not in VOICES:
            raise InvalidInput(f"Unknown voice '{voice}'.")
        data = project["script"]["data"]
        text = " ".join(s["vo_text"].strip() for s in data["scenes"])
        style = (data.get("voice_style") or "") + " " + DEFAULT_STYLE

        def job() -> None:
            def begin(p: dict) -> None:
                p["voice"].update({"status": "running", "error": None, "voice": voice})
                reset_downstream(p, "voice")
            repo.update(pid, begin)
            name = f"voice_{int(time.time())}.wav"
            out = repo.project_dir(pid) / "final" / name
            seconds = self.ctx.voice_synth.synthesize(text, style.strip(), voice, out, lambda m: self.ctx.log(pid, m))

            def done(p: dict) -> None:
                p["voice"].update({"status": "done", "file": f"final/{name}", "duration": seconds, "source": "generated"})
            repo.update(pid, done)
            note = _length_note(seconds, max_voice_seconds(project["brief"]))
            self.ctx.log(pid, f"Voice-over ready: {seconds:.1f}s.{note} Listen and approve.")

        return self.ctx.jobs.start(pid, "voice", job)

    def upload(self, pid: str, upload) -> float:
        repo = self.ctx.repo
        project = repo.load(pid)
        require_approved(project, "script")
        if not upload or not upload.filename:
            raise InvalidInput("Choose an audio file.")
        stamp = int(time.time())
        fdir = repo.project_dir(pid) / "final"
        raw = fdir / f"upload_{stamp}{Path(secure_filename(upload.filename)).suffix or '.audio'}"
        upload.save(raw)
        out = fdir / f"voice_{stamp}.wav"
        try:
            seconds = ffmpeg.to_wav(raw, out)
        except InvalidMedia:
            out.unlink(missing_ok=True)
            raise
        finally:
            raw.unlink(missing_ok=True)

        def apply(p: dict) -> None:
            reset_downstream(p, "voice")
            p["voice"].update({"status": "done", "file": f"final/{out.name}", "duration": seconds,
                               "voice": "your upload", "source": "uploaded", "error": None})
        repo.update(pid, apply)
        note = _length_note(seconds, max_voice_seconds(project["brief"]))
        self.ctx.log(pid, f"Voice-over uploaded: {seconds:.1f}s{note}. Listen and approve.")
        return seconds

    def approve(self, pid: str) -> None:
        if self.ctx.repo.load(pid)["voice"]["status"] != "done":
            raise WorkflowError("No voice-over to approve yet.")
        self.ctx.repo.update(pid, lambda p: p["approved"].__setitem__("voice", True))
        self.ctx.log(pid, "Voice-over approved.")
