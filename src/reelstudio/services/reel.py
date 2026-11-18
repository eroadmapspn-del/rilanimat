"""Stage 4: render the reel with Remotion."""
from __future__ import annotations

import json
import os
import shutil
import time

from ..domain.workflow import require_approved
from ..media import composition, ffmpeg
from .context import Context


class ReelService:
    def __init__(self, ctx: Context):
        self.ctx = ctx

    def build(self, pid: str, draft: bool = False) -> bool:
        repo = self.ctx.repo
        require_approved(repo.load(pid), "scenes")

        def job() -> None:
            repo.update(pid, lambda p: p["final"].update(
                {"status": "running", "error": None, "progress": 0, "draft": draft}))
            project = repo.load(pid)
            pdir = repo.project_dir(pid)
            voice_seconds = ffmpeg.duration(pdir / project["voice"]["file"])
            clip_seconds = {sid: c["duration"] for sid, c in project["scenes"].items() if c.get("duration")}
            props = composition.build_composition(project, voice_seconds, clip_seconds)

            stage = pdir / "render"
            shutil.rmtree(stage, ignore_errors=True)
            stage.mkdir(parents=True)
            for rel in composition.referenced_files(props):
                dest = stage / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                try:
                    os.link(pdir / rel, dest)  # no copy needed when the disk allows hard links
                except OSError:
                    shutil.copy2(pdir / rel, dest)
            props_file = stage / "composition.json"
            props_file.write_text(json.dumps(props, ensure_ascii=False, indent=2), encoding="utf-8")

            total = voice_seconds + props["endCard"]["seconds"]
            kind = "draft preview" if draft else "final reel"
            self.ctx.log(pid, f"Rendering the {kind} ({total:.1f}s, {len(props['scenes'])} scenes) with Remotion...")
            out = pdir / "final" / ("reel_draft.mp4" if draft else "reel.mp4")
            last = {"t": 0.0, "pct": -1}

            def progress(pct: float) -> None:
                if int(pct) == last["pct"] or (time.time() - last["t"] < 1.0 and pct < 100):
                    return
                last.update(t=time.time(), pct=int(pct))
                repo.update(pid, lambda p: p["final"].__setitem__("progress", int(pct)))

            self.ctx.renderer(self.ctx.settings.remotion_dir, props_file, stage, out, draft=draft, on_progress=progress)
            shutil.rmtree(stage, ignore_errors=True)
            rel = f"final/{out.name}?v={int(time.time())}"
            repo.update(pid, lambda p: p["final"].update({"status": "done", "file": rel, "progress": 100}))
            self.ctx.log(pid, f"Your {kind} is ready: {total:.1f}s.")

        return self.ctx.jobs.start(pid, "final", job)
