"""File-based project storage: one folder per project with a project.json inside.

Everything else talks to this class, so swapping it for SQLite or Postgres later is a one-file change.
"""
from __future__ import annotations

import json
import threading
import time
import uuid
from collections.abc import Callable
from pathlib import Path

from ..domain.project import blank_project
from ..errors import NotFound

SUBFOLDERS = ("images", "clips", "final")


class ProjectRepository:
    def __init__(self, data_dir: Path):
        self.root = Path(data_dir)
        self.root.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()

    # ---- paths
    def project_dir(self, pid: str) -> Path:
        if not pid or "/" in pid or "\\" in pid or pid.startswith("."):
            raise NotFound("Project not found.")
        return self.root / pid

    def _file(self, pid: str) -> Path:
        return self.project_dir(pid) / "project.json"

    # ---- create / read / write
    def create(self, brief: dict) -> dict:
        pid = time.strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:4]
        for sub in SUBFOLDERS:
            (self.project_dir(pid) / sub).mkdir(parents=True, exist_ok=True)
        project = blank_project(pid, brief, time.time())
        self.save(project)
        return project

    def load(self, pid: str) -> dict:
        with self._lock:
            path = self._file(pid)
            if not path.exists():
                raise NotFound("Project not found.")
            return json.loads(path.read_text(encoding="utf-8"))

    def save(self, project: dict) -> None:
        with self._lock:
            path = self._file(project["id"])
            text = json.dumps(project, ensure_ascii=False, indent=2)
            tmp = path.with_suffix(".tmp")
            tmp.write_text(text, encoding="utf-8")
            # On Windows the target can be briefly locked (OneDrive sync, a reader). Retry, then fall back.
            for attempt in range(8):
                try:
                    tmp.replace(path)
                    return
                except PermissionError:
                    time.sleep(0.1 * (attempt + 1))
            path.write_text(text, encoding="utf-8")
            tmp.unlink(missing_ok=True)

    def update(self, pid: str, fn: Callable[[dict], None]) -> dict:
        """Load, apply fn(project), save. Thread-safe. If fn raises, nothing is saved."""
        with self._lock:
            project = self.load(pid)
            fn(project)
            self.save(project)
            return project

    def log(self, pid: str, message: str) -> None:
        stamp = time.strftime("%H:%M:%S")
        print(f"[{pid}] {message}", flush=True)

        def add(p: dict) -> None:
            p["logs"].append(f"{stamp}  {message}")
            p["logs"] = p["logs"][-200:]

        self.update(pid, add)

    def list(self) -> list[dict]:
        items = []
        for d in sorted(self.root.iterdir(), reverse=True):
            f = d / "project.json"
            if f.exists():
                p = json.loads(f.read_text(encoding="utf-8"))
                story_title = ((p.get("story") or {}).get("data") or {}).get("title")
                brief = p["brief"]
                title = (p["script"].get("data") or {}).get("title") or story_title
                title = title or brief.get("product") or brief.get("topic", "Untitled")
                items.append({"id": p["id"], "title": title, "created": p["created"]})
        return items

    def recover(self) -> None:
        """On startup, mark steps that were running when the app stopped as failed so the UI isn't stuck."""
        for d in self.root.iterdir():
            f = d / "project.json"
            if not f.exists():
                continue
            p = json.loads(f.read_text(encoding="utf-8"))
            changed = False
            for key in ("story", "script", "voice", "final"):
                if key in p and p[key].get("status") == "running":
                    p[key]["status"] = "error"
                    p[key]["error"] = "Interrupted (the app was restarted). Please run this step again."
                    changed = True
            if changed:
                self.save(p)
