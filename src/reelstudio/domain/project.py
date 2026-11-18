"""The shape of a project, and the limits that keep a reel under 30 seconds."""
from __future__ import annotations

MAX_VOICE_SECONDS = 27.0  # the end card adds END_CARD_SECONDS, so the reel stays <= 30s
END_CARD_SECONDS = 3.0
STORY_MAX_VOICE_SECONDS = 57.0  # story reels may run a full minute (57s voice + 3s end card)
DEFAULT_COLOR = "#ff8a3d"

VOICES = ["Aoede", "Kore", "Zephyr", "Puck", "Charon", "Fenrir"]


def blank_final() -> dict:
    return {"status": "idle", "file": None, "error": None, "progress": 0, "draft": False}


def blank_voice() -> dict:
    return {"status": "idle", "file": None, "duration": None, "voice": None, "source": None, "error": None}


def blank_story() -> dict:
    """`messages` is the chat between the user and the story writer: [{role: user|writer, text}]."""
    return {"status": "idle", "data": None, "error": None, "messages": []}


def is_story(brief: dict) -> bool:
    return brief.get("mode") == "story"


def max_voice_seconds(brief: dict) -> float:
    return STORY_MAX_VOICE_SECONDS if is_story(brief) else MAX_VOICE_SECONDS


def blank_project(pid: str, brief: dict, now: float) -> dict:
    project = {
        "id": pid,
        "created": now,
        "brief": brief,
        "approved": {"script": False, "voice": False, "scenes": False},
        "script": {"status": "idle", "data": None, "error": None},
        "voice": blank_voice(),
        "scenes": {},  # scene id (str) -> uploaded clip {status, file, source, duration}
        "final": blank_final(),
        "logs": [],
    }
    if is_story(brief):  # story reels get an extra first step: the story itself
        project["story"] = blank_story()
        project["approved"] = {"story": False, **project["approved"]}
    return project


def parse_brief(form) -> dict:
    """Validate the 'new reel' form (any mapping with .get) into a clean brief dict."""
    from ..errors import InvalidInput

    if form.get("mode") == "story":
        return _parse_story_brief(form)

    def text(name: str, default: str = "") -> str:
        return (form.get(name) or default).strip()

    try:
        duration = int(form.get("duration") or 26)
    except ValueError as exc:
        raise InvalidInput("Length must be a number of seconds.") from exc
    brief = {
        "brand": text("brand"),
        "product": text("product"),
        "features": text("features"),
        "pets": text("pets"),
        "language": text("language", "Hinglish"),
        "tone": text("tone"),
        "tagline": text("tagline"),
        "cta": text("cta"),
        "notes": text("notes"),
        "color": text("color", DEFAULT_COLOR),
        "duration": max(10, min(int(MAX_VOICE_SECONDS), duration)),
    }
    if not brief["brand"] or not brief["product"]:
        raise InvalidInput("Brand and product are required.")
    if not (len(brief["color"]) == 7 and brief["color"].startswith("#")):
        brief["color"] = DEFAULT_COLOR
    return brief


def _parse_story_brief(form) -> dict:
    """A story reel only needs a topic. Everything else is optional."""
    from ..errors import InvalidInput

    def text(name: str, default: str = "") -> str:
        return (form.get(name) or default).strip()

    try:
        duration = int(form.get("duration") or 55)
    except ValueError as exc:
        raise InvalidInput("Length must be a number of seconds.") from exc
    brief = {
        "mode": "story",
        "topic": text("topic"),
        "language": text("language", "Hinglish"),
        "brand": text("brand"),  # optional page name, shown on the end card
        "tagline": text("tagline"),
        "cta": text("cta"),
        "notes": text("notes"),
        "color": text("color", DEFAULT_COLOR),
        "duration": max(20, min(int(STORY_MAX_VOICE_SECONDS), duration)),
    }
    if len(brief["topic"]) < 3:
        raise InvalidInput("Tell me what the reel should be about.")
    if not (len(brief["color"]) == 7 and brief["color"].startswith("#")):
        brief["color"] = DEFAULT_COLOR
    return brief
