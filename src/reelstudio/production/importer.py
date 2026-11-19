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

POLLS_FILE = Path("polls/terahvi.json")
SHOT_WORDS = 16  # about 6-7 seconds of Hindi narration per shot

# the season's animation names -> this renderer's camera moves
CAMERA = {"slow_push_in": "push-in", "slow_pull_out": "pull-out", "parallax_left": "pan-left", "parallax_right": "pan-right",
          "tilt_up": "tilt-up", "tilt_down": "tilt-down", "static": "static"}
CYCLE = ["push-in", "pan-left", "pull-out", "pan-right", "tilt-up", "drift"]
NORMAL_SPACE = re.compile(r"\s+")

# spoken after the cliffhanger, in the narrator's voice; rotated by episode number so the reels do not all end alike
CTA_LINES = [
    "अगला हिस्सा देखना है? तो अभी फॉलो कर लीजिए।",
    "आगे क्या हुआ, जानने के लिए फॉलो कर लीजिए।",
    "कहानी अभी बाकी है। आगे देखने के लिए फॉलो कर लीजिए, और कमेंट में अपना अंदाज़ा बताइए।",
    "अगली घंटी कल बजेगी। फॉलो कर लीजिए, ताकि कुछ छूट न जाए।",
]


def _split_shots(text: str, max_words: int = SHOT_WORDS) -> list[str]:
    """Cut narration into shots at sentence ends, about `max_words` each. Joined with spaces they give back `text` exactly."""
    sentences = [t for t in re.split(r"(?<=[।?!])\s+", text.strip()) if t]
    n = max(1, round(len(text.split()) / max_words))
    if len(sentences) <= 1 or n == 1:
        return [text]
    target = len(text.split()) / n
    shots, cur, count = [], [], 0
    for sent in sentences:
        cur.append(sent)
        count += len(sent.split())
        if count >= target and len(shots) < n - 1:
            shots.append(" ".join(cur))
            cur, count = [], 0
    if cur:
        shots.append(" ".join(cur))
    return shots


def poll_line(poll: dict) -> str:
    """The closing line: pick A or B in the comments, the answer comes next episode, follow."""
    return f"{poll['ask']} ए, {poll['a']}। बी, {poll['b']}। कमेंट में चुनिए, जवाब अगले एपिसोड में। फॉलो कर लीजिए।"


def _load_polls(path: Path | None) -> dict:
    path = Path(path) if path else POLLS_FILE
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def _clean(text: str) -> str:
    text = NORMAL_SPACE.sub(" ", text).strip()
    return re.sub(r"([—–])(?=\S)", r"\1 ", text)


def import_episode(season: Path, number: int, out: Path, cta: str | None = None, with_cta: bool = True,
                   shots: bool = True, polls: Path | None = None) -> Path:
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
    all_polls = _load_polls(polls)
    scenes = []
    prev = all_polls.get(str(number - 1))
    if prev and prev.get("reveal"):  # the answer to last episode's poll, told before this episode starts
        reveal = _clean(prev["reveal"])
        scenes.append({"text": reveal, "transition": "fade", "role": "reveal", "visual": {
            "prompt": "पिछले एपिसोड के सवाल का जवाब", "file": None, "source": "react-art", "camera": "push-in",
            "art": {"location": "generic", "props": [{"id": "clock"}], "fog": 0.3, "dust": True},
            "atmosphere": {"tint": "#0e2a33", "dim": 0.3}}, "season_scene_id": "reveal"})
        narration = f"{reveal} {narration}"
    for s in scenes_in:
        base = artmap.spec_for(s["visual_prompt_hi"], s["voiceover_text"])
        chunks = _split_shots(_clean(s["voiceover_text"])) if shots else [_clean(s["voiceover_text"])]
        for k, chunk in enumerate(chunks):
            scenes.append({
                "text": chunk,
                "transition": "fade",
                "visual": {
                    "prompt": s["visual_prompt_hi"], "file": None, "source": "react-art",
                    "art": base if len(chunks) == 1 else artmap.shot_for(base, chunk, k),
                    "camera": CAMERA.get(s.get("animation", ""), "drift") if k == 0 else CYCLE[(k + len(scenes)) % len(CYCLE)],
                    "atmosphere": {"tint": "#0e2a33", "dim": 0.3},  # dark teal; the prompts ask for teal and amber light
                },
                "season_scene_id": s["scene_id"],
            })

    if with_cta:  # closing line that asks people to follow; it is part of the narration, so it is voiced and captioned
        poll = all_polls.get(str(number))
        line = _clean(cta) if cta else (poll_line(poll) if poll else CTA_LINES[(number - 1) % len(CTA_LINES)])
        last = scenes[-1]["visual"]
        scenes.append({
            "text": line, "transition": "fade", "role": "cta",
            "visual": {**last, "art": {**last["art"], "characters": []}, "camera": "pull-out"},
            "season_scene_id": "cta",
        })
        narration = f"{narration} {line}"

    story = {
        "meta": {
            "title": ep["title_hi"], "topic": ep["continuity"].get("episode_summary_hi", ""), "language": "Hindi",
            "factuality": "fiction", "hook": narration.split("।")[0] + "।",
            "source": {"season_dir": str(season), "episode_id": ep["episode_id"], "arc": ep["continuity"].get("arc")},
            "delivery": vo.get("delivery", ""), "pace_wpm_target": vo.get("pace_wpm_target"),
            "pronunciations": vo.get("pronunciation_notes", []),
            "audience_question": ep["audience_engagement"]["question_hi"],
            "note": "Fiction. Do not present as real events.", "cta": with_cta,
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
    pin = ep["audience_engagement"]["question_hi"]
    poll = all_polls.get(str(number))
    if poll:
        pin = f"{poll['ask']}\nए) {poll['a']}\nबी) {poll['b']}\nकमेंट में ए या बी लिखिए। जवाब अगले एपिसोड में।"
    (out / "pinned_comment.txt").write_text(pin + "\n", encoding="utf-8")
    return out
