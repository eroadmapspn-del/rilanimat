"""Turn whatever the script writer returned into a clean, renderable scene plan."""
from __future__ import annotations

from ..errors import ProviderError

TEMPLATES = ("hook", "full", "card", "feature", "clip")
MOTIONS = ("zoom-in", "pan-left", "zoom-out", "pan-right", "pan-up")
IMAGE_TEMPLATES = ("full", "card", "feature")


def default_template(index: int, total: int) -> str:
    if index == 0:
        return "hook"
    if index == total - 1:
        return "full"
    return ("card", "feature")[index % 2]


def normalize_scene(scene: dict, index: int, total: int, images: list[str], has_clip: bool = False) -> dict:
    """Fill in anything missing or invalid so the renderer never gets a half-empty scene.

    The "clip" template is only kept when a clip has really been uploaded for the scene.
    """
    scene["id"] = index + 1
    scene["name"] = scene.get("name") or f"scene-{index + 1}"
    scene["vo_text"] = (scene.get("vo_text") or "").strip()
    scene["vo_roman"] = (scene.get("vo_roman") or "").strip()

    template = scene.get("template")
    if template == "clip" and not has_clip:
        template = None
    if template not in TEMPLATES:
        template = default_template(index, total)
    if template in IMAGE_TEMPLATES and not images:
        template = "hook"  # nothing to show, so use big text on colour
    scene["template"] = template

    image = scene.get("image")
    if image not in images:
        image = images[index % len(images)] if images and (template in IMAGE_TEMPLATES or index == 0) else ""
    scene["image"] = image

    scene["motion"] = scene.get("motion") if scene.get("motion") in MOTIONS else MOTIONS[index % len(MOTIONS)]
    scene["headline"] = (scene.get("headline") or scene.get("on_screen_text") or "").strip()
    bullets = scene.get("bullets") or []
    scene["bullets"] = [str(b).strip() for b in bullets if str(b).strip()][:3]
    scene["sticker"] = (scene.get("sticker") or "").strip()[:4]
    return scene


def normalize_script(data: dict, images: list[str], clip_ids: frozenset[int] = frozenset()) -> dict:
    scenes = data.get("scenes") or []
    if not scenes:
        raise ProviderError("The model returned no scenes.")
    for i, scene in enumerate(scenes):
        normalize_scene(scene, i, len(scenes), images, has_clip=(i + 1) in clip_ids)
    data.setdefault("voice_style", "Natural, warm and friendly, like a person talking to a friend.")
    data.setdefault("caption", "")
    data.setdefault("hashtags", [])
    return data
