"""Import one episode of a pre-written season (episodes/ep-NNN/episode.json) as a production.

The season folder is only read. The narration is kept verbatim, except that a dash glued between two words
("आवाज़—हमें") gets a space after it, so each word can be timed and captioned on its own.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from ..errors import InvalidInput
from . import artmap, story_file

# the season's animation names -> this renderer's camera moves
CAMERA = {"slow_push_in": "push-in", "slow_pull_out": "pull-out", "parallax_left": "pan-left", "parallax_right": "pan-right",
          "tilt_up": "tilt-up", "tilt_down": "tilt-down", "static": "static"}
NORMAL_SPACE = re.compile(r"\s+")


def _clean(text: str) -> str:
    text = NORMAL_SPACE.sub(" ", text).strip()
    return re.sub(r"([—–])(?=\S)", r"\1 ", text)


def import_episode(season: Path, number: int, out: Path) -> Path:
    season = Path(season)
    src = season / "episodes" / f"ep-{number:03d}" / "episode.json"
    if not src.exists():
        raise InvalidInput(f"{src} not found.")
    ep = json.loads(src.read_text(encoding="utf-8"))
    scenes_in = ep["scenes"]
    narration = _clean(ep["narration_hi"])
    if _clean(" ".join(s["voiceover_text"] for s in scenes_in)) != narration:
        raise InvalidInput("The scene voice-over texts do not add up to the narration. Fix the episode first.")

    vo = ep.get("voiceover", {})
    scenes = []
    for s in scenes_in:
        scenes.append({
            "text": _clean(s["voiceover_text"]),
            "transition": "fade",
            "visual": {
                "prompt": s["visual_prompt_hi"], "file": None, "source": "react-art",
                "art": artmap.spec_for(s["visual_prompt_hi"], s["voiceover_text"]),
                "camera": CAMERA.get(s.get("animation", ""), "drift"),
                "atmosphere": {"tint": "#0e2a33", "dim": 0.3},  # dark teal; the prompts ask for teal and amber light
            },
            "season_scene_id": s["scene_id"],
        })

    story = {
        "meta": {
            "title": ep["title_hi"], "topic": ep["continuity"].get("episode_summary_hi", ""), "language": "Hindi",
            "factuality": "fiction", "hook": narration.split("।")[0] + "।",
            "source": {"season_dir": str(season), "episode_id": ep["episode_id"], "arc": ep["continuity"].get("arc")},
            "delivery": vo.get("delivery", ""), "pace_wpm_target": vo.get("pace_wpm_target"),
            "pronunciations": vo.get("pronunciation_notes", []),
            "audience_question": ep["audience_engagement"]["question_hi"],
            "note": "Fiction. Do not present as real events.",
        },
        "scenes": scenes,
        "music": None, "sfx": [], "captions": True,
        "production": {"script_status": ep["production"]["script_status"], "voice_status": "not_generated",
                       "image_status": "not_generated", "render_status": "not_generated"},
    }
    out = Path(out)
    for sub in ("audio", "images", "video", "out", "build"):
        (out / sub).mkdir(parents=True, exist_ok=True)
    story_file.save(out, story)
    (out / "pinned_comment.txt").write_text(ep["audience_engagement"]["question_hi"] + "\n", encoding="utf-8")
    return out
