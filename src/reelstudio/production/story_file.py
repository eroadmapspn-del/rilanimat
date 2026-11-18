"""story.json: the one file every production skill reads and writes.

A production lives in its own folder:

    productions/<slug>/
        research.md        story-researcher output
        script.md          viral-scriptwriter output (three hooks, chosen script)
        story.json         this contract (scenes, visuals, voice, music)
        audio/  images/  video/
        build/             generated props + staged public dir (safe to delete)
        out/reel.mp4

See .claude/skills/storyboard-director/references/story-json.md for the field-by-field description.
"""
from __future__ import annotations

import json
from pathlib import Path

from ..errors import InvalidInput

CAMERAS = ("push-in", "pull-out", "pan-left", "pan-right", "tilt-up", "tilt-down", "drift", "static")
TRANSITIONS = ("fade", "slide-up", "slide-left", "zoom", "cut")
SOURCES = ("ai-generated", "stock", "user", "placeholder", "react-art")
VOICE_PROVIDERS = ("sapi", "import", "gemini")

DEFAULT_THEME = {
    "accent": "#ffd166", "text": "#ffffff", "bg": "#16324f",
    "fontFamily": '"Segoe UI", "Nirmala UI", "Noto Sans Devanagari", "Helvetica Neue", Arial, sans-serif',
}


def load(folder: Path) -> dict:
    path = Path(folder) / "story.json"
    if not path.exists():
        raise InvalidInput(f"No story.json in {folder}")
    return json.loads(path.read_text(encoding="utf-8"))


def save(folder: Path, story: dict) -> None:
    path = Path(folder) / "story.json"
    path.write_text(json.dumps(story, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def narration(story: dict) -> str:
    """The exact words that will be spoken: every scene's text, in order."""
    return " ".join(s["text"].strip() for s in story["scenes"] if s.get("text", "").strip())


def problems(story: dict) -> list[str]:
    """Structural problems that make the story impossible to build (the reviewer reports softer issues)."""
    out: list[str] = []
    scenes = story.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        return ["story.json needs a non-empty 'scenes' list."]
    for i, s in enumerate(scenes, 1):
        if not (s.get("text") or "").strip():
            out.append(f"Scene {i} has no 'text' (the words spoken in it).")
        visual = s.get("visual") or {}
        if visual.get("camera", "push-in") not in CAMERAS:
            out.append(f"Scene {i}: camera '{visual.get('camera')}' is not one of {', '.join(CAMERAS)}.")
        if s.get("transition", "fade") not in TRANSITIONS:
            out.append(f"Scene {i}: transition '{s.get('transition')}' is not one of {', '.join(TRANSITIONS)}.")
        art = visual.get("art")
        if art:
            from . import artmap
            if art.get("location") not in artmap.LOCATIONS:
                out.append(f"Scene {i}: art.location '{art.get('location')}' is unknown. Use one of {', '.join(artmap.LOCATIONS)}.")
            for p in art.get("props", []):
                if p.get("id") not in artmap.PROPS:
                    out.append(f"Scene {i}: art prop '{p.get('id')}' is unknown. Use one of {', '.join(artmap.PROPS)}.")
            for c in art.get("characters", []):
                if c.get("id") not in artmap.CHARACTERS:
                    out.append(f"Scene {i}: art character '{c.get('id')}' is unknown. Use one of {', '.join(artmap.CHARACTERS)}.")
        if visual.get("file") and visual.get("source") not in SOURCES:
            out.append(f"Scene {i}: visual.source must be one of {', '.join(SOURCES)} (say honestly where the file came from).")
    return out
