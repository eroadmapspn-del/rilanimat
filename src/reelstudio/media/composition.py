"""Build the JSON that Remotion renders. The shape mirrors remotion/src/types.ts."""
from __future__ import annotations

from ..domain.project import END_CARD_SECONDS
from ..domain.timing import scene_slots, word_timings

FPS = 30


def _hex_to_rgb(color: str) -> tuple[int, int, int]:
    return int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)


def derive_theme(primary: str) -> dict:
    """A deeper second colour for the gradient, a dark ink for text on white, and a light accent."""
    r, g, b = _hex_to_rgb(primary)
    secondary = f"#{int(r * 0.72):02x}{int(g * 0.62):02x}{int(b * 0.55):02x}"
    ink = f"#{int(r * 0.25):02x}{int(g * 0.18):02x}{int(b * 0.15):02x}"
    return {"primary": primary, "secondary": secondary, "ink": ink, "accent": "#ffe066"}


def build_composition(project: dict, voice_seconds: float, clip_seconds: dict[str, float] | None = None) -> dict:
    """Return the Remotion props. File paths are relative to the project folder."""
    brief = project["brief"]
    scenes = project["script"]["data"]["scenes"]
    slots = scene_slots(scenes, voice_seconds)
    clip_seconds = clip_seconds or {}

    out_scenes = []
    for scene, slot in zip(scenes, slots, strict=True):
        sid = str(scene["id"])
        uploaded = project["scenes"].get(sid) or {}
        template = scene["template"]
        clip = uploaded.get("file") if template == "clip" and uploaded.get("status") == "done" else None
        image = f"images/{scene['image']}" if scene.get("image") else None
        captions = scene.get("vo_roman") or scene.get("vo_text", "")
        out_scenes.append({
            "id": scene["id"],
            "template": template,
            "seconds": round(slot, 3),
            "image": image,
            "clip": clip,
            "clipSeconds": clip_seconds.get(sid),
            "headline": scene.get("headline", ""),
            "bullets": scene.get("bullets", []),
            "sticker": scene.get("sticker", ""),
            "motion": scene.get("motion", "zoom-in"),
            "words": word_timings(captions, slot),
        })

    return {
        "fps": FPS,
        "width": 1080,
        "height": 1920,
        "voice": project["voice"]["file"],
        "theme": derive_theme(brief.get("color") or "#ff8a3d"),
        "scenes": out_scenes,
        "endCard": {
            "brand": brief.get("brand", ""),
            "tagline": brief.get("tagline", ""),
            "cta": brief.get("cta", ""),
            "seconds": END_CARD_SECONDS,
        },
    }


def referenced_files(props: dict) -> list[str]:
    """Every file (relative to the project folder) the composition needs."""
    files = []
    if props.get("voice"):
        files.append(props["voice"])
    for scene in props["scenes"]:
        files += [f for f in (scene.get("image"), scene.get("clip")) if f]
    return list(dict.fromkeys(files))
