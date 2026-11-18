"""story.json + voice timings -> Remotion props. Scene timing comes from the audio, never from a guess."""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from ..errors import InvalidInput
from ..media.ffmpeg import FFMPEG
from . import story_file

FPS = 30
TAIL_SECONDS = 0.9  # a short breath after the last word before the reel ends
TRANSITION_SECONDS = 0.5
SAFE = {"top": 250, "bottom": 420, "side": 90}  # px; keeps captions clear of Instagram's buttons and caption bar
VIDEO_SUFFIXES = (".mp4", ".mov", ".webm", ".mkv")
DEFAULT_MOOD = {"tint": "#10243a", "dim": 0.3}


def assign_words(scenes: list[dict], words: list[dict]) -> list[tuple[int, int]]:
    """For each scene, the (first, last+1) index of its words. Scenes consume words in order by word count."""
    spans, i = [], 0
    for scene in scenes:
        n = len(scene["text"].split())
        spans.append((i, min(i + n, len(words))))
        i += n
    if i != len(words):
        raise InvalidInput(
            f"The scenes contain {i} words but the voice-over has {len(words)}. Re-run the voice step after editing the "
            "scene text, or fix the timings file so every spoken word is listed."
        )
    return spans


def build_props(story: dict) -> dict:
    bad = story_file.problems(story)
    if bad:
        raise InvalidInput("story.json is not ready:\n- " + "\n- ".join(bad))
    voice = story.get("voice")
    if not voice or not voice.get("words"):
        raise InvalidInput("There is no voice-over yet. Run the voice step first.")
    words, scenes_in = voice["words"], story["scenes"]
    spans = assign_words(scenes_in, words)
    duration = float(voice["duration"])

    scenes = []
    for i, (scene, (a, _b)) in enumerate(zip(scenes_in, spans, strict=True)):
        visual = scene.get("visual") or {}
        file = visual.get("file")
        art = None if file else visual.get("art")
        start = 0.0 if i == 0 else words[a]["start"]
        nxt = spans[i + 1][0] if i + 1 < len(spans) else None
        end = words[nxt]["start"] if nxt is not None and nxt < len(words) else duration + TAIL_SECONDS
        mood = {**DEFAULT_MOOD, **(visual.get("atmosphere") or {})}
        scenes.append({
            "id": i + 1,
            "start": round(start, 3),
            "end": round(max(end, start + 0.5), 3),
            "media": file,
            "mediaKind": "art" if art else ("none" if not file else ("video" if Path(file).suffix.lower() in VIDEO_SUFFIXES else "image")),
            "art": art,
            "camera": visual.get("camera") or ("push-in" if i % 2 == 0 else "pan-left"),
            "transition": scene.get("transition") or "fade",
            "mood": {"tint": mood["tint"], "dim": float(mood["dim"])},
        })

    music = story.get("music")
    return {
        "fps": FPS, "width": 1080, "height": 1920,
        "durationSeconds": round(duration + TAIL_SECONDS, 3),
        "transitionSeconds": TRANSITION_SECONDS,
        "voice": voice.get("file"),
        "words": words,
        "scenes": scenes,
        "music": {"file": music["file"], "volume": music.get("volume", 0.18), "duckTo": music.get("duckTo", 0.06)} if music else None,
        "sfx": [{"file": s["file"], "at": float(s["at"]), "volume": float(s.get("volume", 0.6))} for s in story.get("sfx", [])],
        "theme": {**story_file.DEFAULT_THEME, **(story.get("theme") or {})},
        "safe": SAFE,
        "showCaptions": story.get("captions", True),
    }


def referenced_files(props: dict) -> list[str]:
    files = [props["voice"]] if props.get("voice") else []
    files += [s["media"] for s in props["scenes"] if s["media"]]
    if props.get("music"):
        files.append(props["music"]["file"])
    files += [s["file"] for s in props["sfx"]]
    return list(dict.fromkeys(files))


VOICE_LUFS = -15.0  # with music ducked underneath, the finished reel lands near -14 LUFS


def normalize_voice(src: Path, dest: Path) -> None:
    """Copy the voice-over to `dest` at a consistent loudness (EBU R128 loudnorm). Falls back to a plain copy."""
    run = subprocess.run(  # noqa: S603
        [FFMPEG, "-y", "-loglevel", "error", "-i", str(src), "-af", f"loudnorm=I={VOICE_LUFS}:TP=-1.5:LRA=7", "-ar", "44100", str(dest)],
        capture_output=True, text=True)
    if run.returncode != 0:
        shutil.copy2(src, dest)


def stage(folder: Path) -> tuple[Path, Path, dict]:
    """Write build/props.json and copy exactly the referenced files into build/public. Returns (props, public, data)."""
    folder = Path(folder)
    story = story_file.load(folder)
    props = build_props(story)
    public = folder / "build" / "public"
    wanted = referenced_files(props)
    if public.exists():  # remove stale files one by one (deleting the folder fails while OneDrive holds it)
        for old in public.rglob("*"):
            if old.is_file() and old.relative_to(public).as_posix() not in wanted:
                try:
                    old.unlink()
                except PermissionError:
                    pass
    for rel in wanted:
        src = folder / rel
        if not src.exists():
            raise InvalidInput(f"'{rel}' is referenced by story.json but the file does not exist: {src}")
        (public / rel).parent.mkdir(parents=True, exist_ok=True)
        if rel == props.get("voice"):
            normalize_voice(src, public / rel)  # the original recording stays untouched
        else:
            shutil.copy2(src, public / rel)
    props_file = folder / "build" / "props.json"
    props_file.write_text(json.dumps(props, ensure_ascii=False, indent=2), encoding="utf-8")
    return props_file, public, props
