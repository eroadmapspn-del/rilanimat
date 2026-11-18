"""Approval gates and what gets reset when an earlier step changes."""
from __future__ import annotations

from ..errors import WorkflowError
from .project import blank_final, blank_voice

ORDER = ["script", "voice", "scenes", "final"]

_MESSAGES = {
    "story": "Approve the story first.",
    "script": "Approve the script first.",
    "voice": "Approve the voice-over first.",
    "scenes": "Approve the scenes first.",
}


def require_approved(project: dict, stage: str) -> None:
    if not project["approved"][stage]:
        raise WorkflowError(_MESSAGES[stage])


def reset_downstream(project: dict, from_stage: str, *, clear_clips: bool = False) -> None:
    """Undo approvals (and results) that depended on `from_stage`, because it changed.

    Uploaded clips belong to a scene, not to the voice, so they survive unless the script is replaced.
    """
    for stage in ORDER[ORDER.index(from_stage):]:
        if stage in project["approved"]:
            project["approved"][stage] = False
    project["final"] = blank_final()
    if from_stage == "script":
        project["voice"] = blank_voice()
        if clear_clips:
            project["scenes"] = {}


def scene_problems(project: dict) -> list[str]:
    """Why the scene plan cannot be approved yet (empty list means it is ready)."""
    data = project["script"].get("data") or {}
    problems = []
    for scene in data.get("scenes", []):
        sid = scene["id"]
        template = scene.get("template")
        if template == "clip":
            clip = project["scenes"].get(str(sid)) or {}
            if clip.get("status") != "done":
                problems.append(f"Scene {sid} is set to 'your clip' but no clip is uploaded.")
        elif template in ("full", "card", "feature") and not scene.get("image"):
            problems.append(f"Scene {sid} needs a product photo.")
    return problems
