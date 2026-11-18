"""Routes for the four pipeline stages: script, voice, scenes, reel."""
from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

bp = Blueprint("pipeline", __name__, url_prefix="/api/projects/<pid>")


def svc():
    return current_app.extensions["services"]


def ok(**extra):
    return jsonify({"ok": True, **extra})


# ---- 0. story (story reels only)
@bp.post("/story/generate")
def story_generate(pid: str):
    return jsonify({"started": svc().story.generate(pid)})


@bp.post("/story/revise")
def story_revise(pid: str):
    message = (request.get_json(silent=True) or {}).get("message", "")
    return jsonify({"started": svc().story.revise(pid, message)})


@bp.post("/story/approve")
def story_approve(pid: str):
    svc().story.approve(pid)
    return ok()


@bp.post("/story/reopen")
def story_reopen(pid: str):
    svc().story.reopen(pid)
    return ok()


# ---- 1. script
@bp.post("/script/generate")
def script_generate(pid: str):
    return jsonify({"started": svc().script.generate(pid)})


@bp.put("/script")
def script_save(pid: str):
    svc().script.save(pid, request.get_json(force=True))
    return ok()


@bp.post("/script/approve")
def script_approve(pid: str):
    svc().script.approve(pid)
    return ok()


# ---- 2. voice
@bp.post("/voice/generate")
def voice_generate(pid: str):
    voice = (request.get_json(silent=True) or {}).get("voice")
    return jsonify({"started": svc().voice.generate(pid, voice)})


@bp.post("/voice/upload")
def voice_upload(pid: str):
    return ok(duration=svc().voice.upload(pid, request.files.get("file")))


@bp.post("/voice/approve")
def voice_approve(pid: str):
    svc().voice.approve(pid)
    return ok()


# ---- 3. scenes
@bp.put("/scenes/plan")
def scenes_plan(pid: str):
    svc().scenes.update_plan(pid, (request.get_json(force=True) or {}).get("scenes"))
    return ok()


@bp.post("/scenes/<int:sid>/upload")
def scene_upload(pid: str, sid: int):
    svc().scenes.upload_clip(pid, sid, request.files.get("file"))
    return ok()


@bp.delete("/scenes/<int:sid>/clip")
def scene_remove_clip(pid: str, sid: int):
    svc().scenes.remove_clip(pid, sid)
    return ok()


@bp.post("/scenes/upload-many")
def scenes_upload_many(pid: str):
    return ok(filled=svc().scenes.upload_many(pid, request.files.getlist("files")))


@bp.post("/scenes/approve")
def scenes_approve(pid: str):
    svc().scenes.approve(pid)
    return ok()


# ---- 4. reel
@bp.post("/final/build")
def final_build(pid: str):
    draft = bool((request.get_json(silent=True) or {}).get("draft"))
    return jsonify({"started": svc().reel.build(pid, draft)})
