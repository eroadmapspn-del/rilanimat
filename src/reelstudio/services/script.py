"""Stage 1: the script (voice-over text plus a visual plan for each scene)."""
from __future__ import annotations

from ..domain import planning
from ..domain.project import is_story
from ..domain.workflow import require_approved, reset_downstream
from ..errors import InvalidInput, WorkflowError
from .context import Context


class ScriptService:
    def __init__(self, ctx: Context):
        self.ctx = ctx

    def generate(self, pid: str) -> bool:
        repo = self.ctx.repo
        project = repo.load(pid)
        if is_story(project["brief"]):
            require_approved(project, "story")

        def job() -> None:
            def begin(p: dict) -> None:
                p["script"] = {"status": "running", "data": None, "error": None}
                reset_downstream(p, "script", clear_clips=True)
            repo.update(pid, begin)
            images = project["brief"].get("images", [])
            brief = {**project["brief"], "story": project["story"]["data"]} if is_story(project["brief"]) else project["brief"]
            data = self.ctx.script_writer.write(brief, images, lambda m: self.ctx.log(pid, m))
            data = planning.normalize_script(data, images)

            def done(p: dict) -> None:
                p["script"] = {"status": "done", "data": data, "error": None}
            repo.update(pid, done)
            self.ctx.log(pid, f"Script ready: {len(data['scenes'])} scenes. Review it and approve.")

        return self.ctx.jobs.start(pid, "script", job)

    def save(self, pid: str, data: dict) -> None:
        """Save the user's edits. Changing the words invalidates the voice-over and everything after."""
        if not isinstance(data, dict) or not isinstance(data.get("scenes"), list) or not data["scenes"]:
            raise InvalidInput("The script needs at least one scene.")

        def apply(p: dict) -> None:
            if not p["script"].get("data"):
                raise WorkflowError("Write a script first.")
            clips = frozenset(int(k) for k, v in p["scenes"].items() if v.get("status") == "done")
            old = p["script"]["data"]["scenes"]
            old_text = [s.get("vo_text", "").strip() for s in old]
            # keep the real scene ids stable, then fill anything missing
            planning.normalize_script(data, p["brief"].get("images", []), clips)
            new_text = [s["vo_text"] for s in data["scenes"]]
            p["script"]["data"] = data
            p["script"]["status"] = "done"
            if new_text != old_text:
                reset_downstream(p, "script")  # words changed: the voice-over no longer matches
            else:
                reset_downstream(p, "scenes")  # only the visuals changed: keep the voice-over
        self.ctx.repo.update(pid, apply)

    def approve(self, pid: str) -> None:
        project = self.ctx.repo.load(pid)
        if project["script"]["status"] != "done":
            raise WorkflowError("No script to approve yet.")
        self.ctx.repo.update(pid, lambda p: p["approved"].__setitem__("script", True))
        self.ctx.log(pid, "Script approved.")
