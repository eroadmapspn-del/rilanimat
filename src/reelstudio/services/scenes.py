"""Stage 3: the visual plan for each scene (template, photo, motion, headline) and optional own clips."""
from __future__ import annotations

import re
import time
from pathlib import Path

from werkzeug.utils import secure_filename

from ..domain import planning
from ..domain.workflow import require_approved, reset_downstream, scene_problems
from ..errors import InvalidInput, InvalidMedia, NotFound, WorkflowError
from ..media import ffmpeg
from .context import Context

PLAN_FIELDS = ("template", "image", "motion", "headline", "bullets", "sticker")


def _natural_key(name: str) -> list:
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", name)]


class SceneService:
    def __init__(self, ctx: Context):
        self.ctx = ctx

    # ---- the visual plan
    def update_plan(self, pid: str, patches: list[dict]) -> None:
        """Change how scenes look. The voice-over is untouched; scenes need re-approval."""
        if not isinstance(patches, list):
            raise InvalidInput("Send a list of scene changes.")

        def apply(p: dict) -> None:
            require_approved(p, "voice")
            scenes = p["script"]["data"]["scenes"]
            by_id = {s["id"]: s for s in scenes}
            for patch in patches:
                scene = by_id.get(patch.get("id"))
                if scene is None:
                    raise NotFound(f"Scene {patch.get('id')} does not exist.")
                for field in PLAN_FIELDS:
                    if field in patch:
                        scene[field] = patch[field]
                if scene["template"] not in planning.TEMPLATES:
                    raise InvalidInput(f"Unknown template '{scene['template']}'.")
            clips = frozenset(int(k) for k, v in p["scenes"].items() if v.get("status") == "done")
            planning.normalize_script(p["script"]["data"], p["brief"].get("images", []), clips)
            reset_downstream(p, "scenes")
        self.ctx.repo.update(pid, apply)

    # ---- own clips
    def upload_clip(self, pid: str, sid: int, upload) -> None:
        err = self._save_clip(pid, sid, upload)
        if err:
            raise InvalidMedia(err)

    def upload_many(self, pid: str, uploads: list) -> int:
        """Fill scenes 1, 2, 3... in file-name order."""
        project = self.ctx.repo.load(pid)
        require_approved(project, "voice")
        ids = [s["id"] for s in project["script"]["data"]["scenes"]]
        files = sorted((f for f in uploads if f and f.filename), key=lambda f: _natural_key(f.filename))
        if not files:
            raise InvalidInput("Choose video files.")
        if len(files) > len(ids):
            raise InvalidInput(f"You chose {len(files)} clips but the script has {len(ids)} scenes.")
        errors = [e for e in (self._save_clip(pid, sid, f) for sid, f in zip(ids, files, strict=False)) if e]
        if errors:
            raise InvalidMedia(" ".join(errors))
        return len(files)

    def remove_clip(self, pid: str, sid: int) -> None:
        def apply(p: dict) -> None:
            p["scenes"].pop(str(sid), None)
            scenes = p["script"]["data"]["scenes"]
            for scene in scenes:
                if scene["id"] == sid and scene["template"] == "clip":
                    scene["template"] = planning.default_template(sid - 1, len(scenes))
            planning.normalize_script(p["script"]["data"], p["brief"].get("images", []),
                                      frozenset(int(k) for k in p["scenes"]))
            reset_downstream(p, "scenes")
        self.ctx.repo.update(pid, apply)

    def approve(self, pid: str) -> None:
        project = self.ctx.repo.load(pid)
        require_approved(project, "voice")
        problems = scene_problems(project)
        if problems:
            raise WorkflowError(" ".join(problems))
        self.ctx.repo.update(pid, lambda p: p["approved"].__setitem__("scenes", True))
        self.ctx.log(pid, "Scenes approved.")

    # ---- helpers
    def _save_clip(self, pid: str, sid: int, upload) -> str:
        """Save an uploaded video for a scene. Returns an error message, or '' on success."""
        repo = self.ctx.repo
        project = repo.load(pid)
        require_approved(project, "voice")
        if sid not in [s["id"] for s in project["script"]["data"]["scenes"]]:
            raise NotFound(f"Scene {sid} does not exist.")
        if not upload or not upload.filename:
            raise InvalidInput("Choose a video file.")
        rel = f"clips/scene{sid}_{int(time.time() * 1000)}{Path(secure_filename(upload.filename)).suffix or '.mp4'}"
        path = repo.project_dir(pid) / rel
        upload.save(path)
        try:
            seconds = ffmpeg.duration(path)
        except InvalidMedia:
            path.unlink(missing_ok=True)
            return f"{upload.filename} could not be read as a video."

        def apply(p: dict) -> None:
            p["scenes"][str(sid)] = {"status": "done", "file": rel, "source": "uploaded", "duration": seconds}
            for scene in p["script"]["data"]["scenes"]:
                if scene["id"] == sid:
                    scene["template"] = "clip"
            reset_downstream(p, "scenes")
        repo.update(pid, apply)
        self.ctx.log(pid, f"Scene {sid}: uploaded {upload.filename} ({seconds:.1f}s)")
        return ""
