"""Command line for the production pipeline:  python -m reelstudio.production <command> ...

    new <folder>          create productions/<slug> with an empty story.json template
    voice <folder>        make the voice-over and word timings   (--provider sapi | import | gemini)
    placeholders <folder> draw clearly-labelled placeholder images for scenes that have no image yet
    ambient <folder>      synthesize a quiet ambient music bed locally (no download, no licence issue)
    build <folder>        story.json + voice timings -> build/props.json and build/public/
    render <folder>       build, then render out/reel.mp4 with Remotion  (--draft for a small fast preview)
    review <folder>       mechanical quality checks  (--video also checks out/reel.mp4)
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from ..errors import ReelStudioError
from . import review, story_file, timeline, voice

TEMPLATE = {
    "meta": {"title": "", "topic": "", "language": "English", "hook": ""},
    "scenes": [
        {"text": "", "transition": "fade",
         "visual": {"prompt": "", "file": None, "source": None, "camera": "push-in", "atmosphere": {"tint": "#10243a", "dim": 0.3}}},
    ],
    "music": None,
    "sfx": [],
    "captions": True,
}


def cmd_new(a) -> None:
    folder = Path(a.folder)
    for sub in ("audio", "images", "video", "out", "build"):
        (folder / sub).mkdir(parents=True, exist_ok=True)
    if (folder / "story.json").exists():
        print(f"{folder}/story.json already exists, left untouched.")
        return
    story_file.save(folder, TEMPLATE)
    print(f"Created {folder}. Fill in story.json (see .claude/skills/storyboard-director/references/story-json.md).")


def cmd_import_episode(a) -> None:
    from .importer import import_episode

    out = import_episode(Path(a.season), a.number, Path(a.out or f"productions/ep-{a.number:03d}"),
                         cta=a.cta, with_cta=not a.no_cta,
                         shots=not a.no_shots, polls=Path(a.polls) if a.polls else None, friendly=a.friendly)
    print(f"Imported episode {a.number} into {out}. The season files were not changed. Next: voice, then images.")


def cmd_voice(a) -> None:
    info = voice.run(Path(a.folder), a.provider, audio=Path(a.audio) if a.audio else None,
                     timings=Path(a.timings) if a.timings else None, voice_name=a.voice_name, rate=a.rate, style=a.style)
    print(f"Voice-over: {info['duration']:.1f}s, {len(info['words'])} words, timing={info['timing']}")
    for n in info["notes"]:
        print("  note:", n)


def cmd_placeholders(a) -> None:
    from PIL import Image, ImageDraw, ImageFilter

    folder = Path(a.folder)
    story = story_file.load(folder)
    made = 0
    for i, scene in enumerate(story["scenes"], 1):
        v = scene.setdefault("visual", {})
        if v.get("file") or v.get("art"):
            continue
        tint = (v.get("atmosphere") or {}).get("tint", "#10243a").lstrip("#")
        base = tuple(int(tint[k:k + 2], 16) for k in (0, 2, 4))
        img = Image.new("RGB", (1080, 1920))
        px = ImageDraw.Draw(img)
        for y in range(1920):  # vertical gradient, lighter at the top
            k = 1.5 - 1.1 * (y / 1919)  # lighter at the top
            px.line([(0, y), (1080, y)], fill=tuple(min(255, int(c * k)) for c in base))
        glow = Image.new("RGB", (1080, 1920), (0, 0, 0))
        ImageDraw.Draw(glow).ellipse([140 + 60 * (i % 3), 360, 940 - 60 * (i % 2), 1160], fill=tuple(min(255, c * 3) for c in base))
        img = Image.blend(img, glow.filter(ImageFilter.GaussianBlur(160)), 0.55)
        ImageDraw.Draw(img).text((60, 1780), f"PLACEHOLDER  scene {i}  (replace with real art)", fill=(255, 255, 255))
        rel = f"images/placeholder_scene{i:02d}.png"
        (folder / "images").mkdir(exist_ok=True)
        img.save(folder / rel)
        v.update({"file": rel, "kind": "image", "source": "placeholder"})
        made += 1
    story_file.save(folder, story)
    print(f"Made {made} placeholder image(s). They are marked source=placeholder, and the reviewer will flag them.")


def cmd_ambient(a) -> None:
    from ..media.ffmpeg import FFMPEG

    folder = Path(a.folder)
    out = folder / "audio" / "ambient.mp3"
    (folder / "audio").mkdir(exist_ok=True)
    chord = [110.0, 164.81, 220.0, 277.18]  # A2 E3 A3 C#4: an open, quiet pad
    inputs, mix = [], []
    for k, hz in enumerate(chord):
        inputs += ["-f", "lavfi", "-i", f"sine=frequency={hz}:sample_rate=44100:duration={a.seconds}"]
        mix.append(f"[{k}]tremolo=f={0.1 + 0.04 * k:.2f}:d=0.5,volume=0.5[a{k}]")
    graph = ";".join(mix) + ";" + "".join(f"[a{k}]" for k in range(len(chord))) + f"amix=inputs={len(chord)}:normalize=1,lowpass=f=900,volume=1.6"
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", *inputs, "-filter_complex", graph, "-b:a", "128k", str(out)], check=True)  # noqa: S603
    story = story_file.load(folder)
    story["music"] = {"file": "audio/ambient.mp3", "volume": 0.2, "duckTo": 0.07, "source": "synthesized locally with ffmpeg",
                      "license": "Generated on this machine from sine waves. No third-party rights."}
    story_file.save(folder, story)
    print(f"Wrote {out} and added it to story.json.")


def cmd_build(a) -> None:
    props_file, public, props = timeline.stage(Path(a.folder))
    print(f"Built {props_file} ({props['durationSeconds']:.1f}s, {len(props['scenes'])} scenes). Files staged in {public}.")


def cmd_render(a) -> None:
    from ..config import load_settings
    from ..media import remotion

    folder = Path(a.folder)
    props_file, public, _ = timeline.stage(folder)
    out = folder / "out" / ("draft.mp4" if a.draft else "reel.mp4")
    out.parent.mkdir(exist_ok=True)
    last = [-10]

    def progress(pct: float) -> None:
        if pct - last[0] >= 10 or pct >= 100:  # one line per 10%, so logs stay readable
            last[0] = pct
            print(f"  rendering {pct:3.0f}%", flush=True)

    remotion.render(load_settings().remotion_dir, props_file.resolve(), public.resolve(), out.resolve(), draft=a.draft,
                    composition="Story", on_progress=progress)
    print(f"Rendered {out}")


def cmd_review(a) -> None:
    folder = Path(a.folder)
    findings = review.review_story(folder)
    if a.video:
        findings += review.review_video(folder, Path(a.mp4) if a.mp4 else None)
    for item in findings:
        print(item)
    errors = sum(x.level == "error" for x in findings)
    warns = sum(x.level == "warn" for x in findings)
    print(f"\n{errors} error(s), {warns} warning(s).")
    if a.json:
        Path(a.json).write_text(json.dumps([x.__dict__ for x in findings], indent=2), encoding="utf-8")
    sys.exit(1 if errors else 0)


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="reelstudio.production", description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name, fn in (("new", cmd_new), ("voice", cmd_voice), ("placeholders", cmd_placeholders), ("ambient", cmd_ambient),
                     ("build", cmd_build), ("render", cmd_render), ("review", cmd_review)):
        p = sub.add_parser(name)
        p.add_argument("folder")
        p.set_defaults(fn=fn)
        if name == "voice":
            p.add_argument("--provider", choices=story_file.VOICE_PROVIDERS, default="sapi")
            p.add_argument("--audio", help="your recording (provider import)")
            p.add_argument("--timings", help="word timings JSON for your recording")
            p.add_argument("--voice-name", default="", help='e.g. "Microsoft Zira Desktop"')
            p.add_argument("--rate", type=int, default=0, help="sapi speed, -10 slow to 10 fast")
            p.add_argument("--style", default="", help="delivery note for gemini (default: meta.delivery)")
        if name == "ambient":
            p.add_argument("--seconds", type=int, default=65)
        if name == "render":
            p.add_argument("--draft", action="store_true")
        if name == "review":
            p.add_argument("--video", action="store_true")
            p.add_argument("--mp4")
            p.add_argument("--json", help="also write the findings here")
    imp = sub.add_parser("import-episode", help="import one episode of a pre-written season")
    imp.add_argument("season", help="the season folder (contains episodes/ep-NNN/episode.json)")
    imp.add_argument("number", type=int)
    imp.add_argument("--out", help="default productions/ep-NNN")
    imp.add_argument("--cta", help="closing line asking viewers to follow (default: a rotating Hindi line)")
    imp.add_argument("--no-cta", action="store_true")
    imp.add_argument("--no-shots", action="store_true", help="one picture per season scene, not per sentence group")
    imp.add_argument("--polls", help="poll file (default polls/terahvi.json)")
    imp.add_argument("--friendly", action="store_true", help="lighter, warmer storybook look with softer faces")
    imp.set_defaults(fn=cmd_import_episode)
    for stream in (sys.stdout, sys.stderr):  # Hindi text must not crash a legacy Windows console
        stream.reconfigure(encoding="utf-8", errors="replace")
    args = ap.parse_args(argv)
    try:
        args.fn(args)
    except ReelStudioError as exc:
        sys.exit(f"error: {exc}")


if __name__ == "__main__":
    main()
