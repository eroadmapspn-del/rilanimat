"""Create projects, add product photos, and describe a project's current state."""
from __future__ import annotations

import shutil
from pathlib import Path

from werkzeug.utils import secure_filename

from ..domain.project import parse_brief
from ..domain.timing import scene_slots
from ..errors import InvalidInput
from .context import Context

IMAGE_SUFFIXES = (".jpg", ".jpeg", ".png", ".webp")


class ProjectService:
    def __init__(self, ctx: Context):
        self.ctx = ctx

    def list(self) -> list[dict]:
        return self.ctx.repo.list()

    def create(self, form, images, use_saved: bool) -> str:
        brief = parse_brief(form)
        project = self.ctx.repo.create(brief)
        pid = project["id"]
        names = self._save_uploads(pid, images)
        if not names and use_saved:
            names = self._copy_saved_photos(pid)
        self.ctx.repo.update(pid, lambda p: p["brief"].__setitem__("images", names))
        self.ctx.log(pid, f"Project created with {len(names)} product photo(s).")
        return pid

    def add_images(self, pid: str, images) -> list[str]:
        self.ctx.repo.load(pid)  # 404 if missing
        added = self._save_uploads(pid, images)
        if not added:
            raise InvalidInput("Choose at least one image (jpg, png or webp).")

        def apply(p: dict) -> None:
            known = p["brief"].get("images", [])
            p["brief"]["images"] = known + [n for n in added if n not in known]
        self.ctx.repo.update(pid, apply)
        self.ctx.log(pid, f"Added {len(added)} product photo(s).")
        return added

    def state(self, pid: str) -> dict:
        """The project plus what the UI needs: running jobs, scene time slots and render readiness."""
        project = self.ctx.repo.load(pid)
        project["running"] = self.ctx.jobs.running(pid)
        data, seconds = project["script"].get("data"), project["voice"].get("duration")
        project["slots"] = scene_slots(data["scenes"], seconds) if data and seconds else None
        return project

    # ---- helpers
    def _save_uploads(self, pid: str, files) -> list[str]:
        img_dir = self.ctx.repo.project_dir(pid) / "images"
        names = []
        for up in files or []:
            if not (up and up.filename):
                continue
            name = secure_filename(up.filename)
            if Path(name).suffix.lower() not in IMAGE_SUFFIXES:
                continue
            up.save(img_dir / name)
            names.append(name)
        return names

    def _copy_saved_photos(self, pid: str) -> list[str]:
        src_dir = self.ctx.settings.assets_dir
        if not src_dir.exists():
            return []
        img_dir = self.ctx.repo.project_dir(pid) / "images"
        names = []
        for src in sorted(src_dir.iterdir()):
            if src.suffix.lower() in IMAGE_SUFFIXES:
                shutil.copy(src, img_dir / src.name)
                names.append(src.name)
        return names
