"""Mechanical quality checks for a production (story.json, timings, final MP4).

These catch what a script can measure. Taste (is the hook good, is the story satisfying) is the job of the
reel-quality-reviewer skill, which runs this first and then reads the script itself.
"""
from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

from ..media.ffmpeg import FFMPEG
from . import story_file, timeline
from .voice import _norm

# Phrases that make narration sound machine-written. A hit is a warning, not an error.
CLICHES = (
    "in a world where", "little did he know", "little did she know", "little did they know", "delve", "tapestry",
    "unleash", "game-changer", "game changer", "buckle up", "let that sink in", "you won't believe", "what happened next",
    "shocked everyone", "changed everything forever", "the rest is history", "mind-blowing", "dive into", "in today's",
    "at the end of the day", "it's important to note",
)
BAIT = ("like and follow", "follow for more", "comment below", "smash that", "subscribe", "tag a friend", "share this")

LUFS_RANGE = (-19.0, -13.0)  # social platforms normalise around -14; this is the comfortable window for voice + music
MAX_PEAK_DB = -1.0
CHARS_PER_LINE = 17  # 84px bold uppercase in the 900px safe width


@dataclass
class Finding:
    level: str  # error | warn | info
    area: str
    message: str

    def __str__(self) -> str:
        return f"[{self.level.upper():5}] {self.area}: {self.message}"


def review_story(folder: Path) -> list[Finding]:
    f: list[Finding] = []
    story = story_file.load(folder)
    for p in story_file.problems(story):
        f.append(Finding("error", "structure", p))
    if f:
        return f
    scenes, voice = story["scenes"], story.get("voice")
    text = story_file.narration(story)
    lower = text.lower()

    # ---- script
    first = re.split(r"(?<=[.!?।])\s", scenes[0]["text"].strip())[0].split()  # the first sentence is the hook
    if len(first) > 16:
        f.append(Finding("warn", "hook", f"The opening line is {len(first)} words. Hooks land in 12 or fewer."))
    for phrase in CLICHES:
        if phrase in lower:
            f.append(Finding("warn", "script", f"Generic phrase: '{phrase}'. Say it in a way only this story could."))
    for phrase in BAIT:
        if phrase in lower:
            f.append(Finding("warn", "script", f"Engagement bait in the narration: '{phrase}'. End the story, not with a request."))
    for m in re.finditer(r"\b(\w+)\s+\1\b", lower):
        f.append(Finding("warn", "spelling", f"Repeated word: '{m.group(0)}'."))
    if re.search(r"\d", text):
        f.append(Finding("warn", "voice", "Digits in the narration. Write numbers as words so the voice and captions agree."))

    # ---- assets
    for i, s in enumerate(scenes, 1):
        v = s.get("visual") or {}
        if v.get("art") and not v.get("file"):
            if i == 1:
                f.append(Finding("info", "assets", "Scenes are React-drawn illustrations (stylised, not photographic)."))
        elif not v.get("file"):
            f.append(Finding("error", "assets", f"Scene {i} has no image or video yet (prompt: {v.get('prompt', 'none')[:60]!r})."))
        elif not (Path(folder) / v["file"]).exists():
            f.append(Finding("error", "assets", f"Scene {i}: file '{v['file']}' does not exist."))
        elif v.get("source") == "placeholder":
            f.append(Finding("warn", "assets", f"Scene {i} uses a placeholder, not a real image. Replace it before publishing."))
        if i > 1 and v.get("file") and v.get("file") == (scenes[i - 2].get("visual") or {}).get("file"):
            f.append(Finding("warn", "variety", f"Scenes {i - 1} and {i} use the same file."))
        if i > 1 and (v.get("camera") and v.get("camera") == (scenes[i - 2].get("visual") or {}).get("camera")):
            f.append(Finding("info", "variety", f"Scenes {i - 1} and {i} use the same camera move ({v['camera']})."))
    music = story.get("music")
    if music and not (Path(folder) / music["file"]).exists():
        f.append(Finding("error", "audio", f"Music file '{music['file']}' does not exist."))
    if music and not music.get("license"):
        f.append(Finding("warn", "audio", "The music has no 'license' note. Record where it came from and that you may use it."))
    if not music:
        f.append(Finding("info", "audio", "No background music."))

    # ---- voice and timing
    if not voice:
        f.append(Finding("error", "voice", "No voice-over yet."))
        return f
    if voice.get("timing") == "estimated":
        f.append(Finding("warn", "captions", "Word timings are ESTIMATED, so captions can drift. Use measured timings."))
    elif voice.get("timing") == "pause-aligned":
        f.append(Finding("info", "captions", "Timings are pause-aligned: each phrase is placed correctly, words inside it are approximate."))
    for note in voice.get("notes", []):
        f.append(Finding("warn", "voice", note))
    duration, words = float(voice["duration"]), voice["words"]
    total = duration + timeline.TAIL_SECONDS
    if not 30 <= total <= 61:
        f.append(Finding("warn", "pacing", f"The reel is {total:.1f}s. Target 30 to 60 seconds."))
    wps = len(words) / max(duration, 0.1)
    if not 1.8 <= wps <= 3.4:
        f.append(Finding("warn", "pacing", f"{wps:.1f} words per second. Natural narration is about 2.0 to 3.0."))
    if words and words[0]["start"] > 1.0:
        f.append(Finding("warn", "hook", f"The first word is spoken at {words[0]['start']:.1f}s. Trim the lead-in so the hook starts at once."))
    for i, w in enumerate(words[:-1]):
        gap = words[i + 1]["start"] - w["end"]
        if gap > 1.2:
            f.append(Finding("info", "pacing", f"A {gap:.1f}s silence after '{w['w']}'. Fine for a beat, dead air if it is not intended."))

    # ---- captions
    for w in words:
        if len(_norm(w["w"])) > CHARS_PER_LINE:
            f.append(Finding("error", "captions", f"'{w['w']}' is too long to fit the safe width and would be cut off."))
    try:
        props = timeline.build_props(story)
    except Exception as exc:  # noqa: BLE001 - report it as a finding
        f.append(Finding("error", "timeline", str(exc)))
        return f
    for sc in props["scenes"]:
        length = sc["end"] - sc["start"]
        if length < 1.5:
            f.append(Finding("warn", "pacing", f"Scene {sc['id']} lasts {length:.1f}s. Too short to register."))
        if length > 9:
            f.append(Finding("warn", "pacing", f"Scene {sc['id']} lasts {length:.1f}s. Split it or add motion."))
    s = props["safe"]
    f.append(Finding("info", "layout", f"Captions sit {s['bottom']}px above the bottom edge and {s['side']}px from the sides (mobile-safe)."))
    f.append(Finding("info", "captions", "Proofread these words as they appear on screen: " + " ".join(w["w"] for w in words)))
    return f


# ------------------------------------------------------------------------------------------------ the MP4
def _ffmpeg(args: list[str]) -> str:
    run = subprocess.run([FFMPEG, "-hide_banner", *args], capture_output=True, text=True, encoding="utf-8", errors="replace")  # noqa: S603
    return run.stderr


def review_video(folder: Path, mp4: Path | None = None) -> list[Finding]:
    folder = Path(folder)
    mp4 = Path(mp4) if mp4 else folder / "out" / "reel.mp4"
    f: list[Finding] = []
    if not mp4.exists():
        return [Finding("error", "video", f"{mp4} does not exist. Render first.")]
    info = _ffmpeg(["-i", str(mp4)])
    m = re.search(r"Video: (\w+).*?(\d{3,5})x(\d{3,5}).*?(\d+(?:\.\d+)?) fps", info, re.S)
    if not m:
        return [Finding("error", "video", "ffmpeg could not read a video stream from the file.")]
    codec, w, h, fps = m.group(1), int(m.group(2)), int(m.group(3)), float(m.group(4))
    if (w, h) != (1080, 1920):
        f.append(Finding("error", "video", f"Size is {w}x{h}, expected 1080x1920."))
    if abs(fps - 30) > 0.5:
        f.append(Finding("warn", "video", f"{fps:g} fps (expected 30)."))
    if codec != "h264":
        f.append(Finding("warn", "video", f"Codec is {codec}; Instagram prefers h264."))
    if not re.search(r"Audio: ", info):
        f.append(Finding("error", "audio", "The MP4 has no audio track."))
    d = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", info)
    seconds = int(d.group(1)) * 3600 + int(d.group(2)) * 60 + float(d.group(3)) if d else 0.0
    expected = None
    props_file = folder / "build" / "props.json"
    if props_file.exists():
        import json
        expected = json.loads(props_file.read_text(encoding="utf-8"))["durationSeconds"]
        if abs(seconds - expected) > 0.5:
            f.append(Finding("error", "video", f"Length is {seconds:.1f}s but the composition is {expected:.1f}s."))
    if seconds > 90:
        f.append(Finding("warn", "video", f"{seconds:.0f}s is long for a reel (limit 90s, sweet spot 30 to 60)."))

    decode = _ffmpeg(["-v", "error", "-i", str(mp4), "-f", "null", "-"])
    if decode.strip():
        f.append(Finding("error", "video", "Decoding reported errors: " + decode.strip()[:200]))

    loud = _ffmpeg(["-i", str(mp4), "-af", "ebur128=peak=true", "-f", "null", "-"])
    lufs = re.findall(r"\bI:\s+(-?\d+(?:\.\d+)?) LUFS", loud)
    peak = re.findall(r"\bPeak:\s+(-?\d+(?:\.\d+)?) dBFS", loud)
    if lufs:
        value = float(lufs[-1])
        if not LUFS_RANGE[0] <= value <= LUFS_RANGE[1]:
            f.append(Finding("warn", "audio", f"Loudness is {value:.1f} LUFS. Aim for about -14 (acceptable {LUFS_RANGE[0]:g} to {LUFS_RANGE[1]:g})."))
        else:
            f.append(Finding("info", "audio", f"Loudness {value:.1f} LUFS (good)."))
    if peak and float(peak[-1]) > MAX_PEAK_DB:
        f.append(Finding("warn", "audio", f"True peak {float(peak[-1]):.1f} dBFS can clip after platform re-encoding (keep below {MAX_PEAK_DB:g})."))
    f.append(Finding("info", "video", f"{w}x{h}, {fps:g} fps, {codec}, {seconds:.1f}s."))
    return f


def has_errors(findings: list[Finding]) -> bool:
    return any(x.level == "error" for x in findings)
