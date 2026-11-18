"""Offline providers for tests and demos (REELSTUDIO_PROVIDER=fake). No network, no quota."""
from __future__ import annotations

import math
import struct
import wave
from pathlib import Path

from .base import Log

_LINES = [
    ("hook", "Bruno ko bhi chalna hai!", "Bruno ko bhi chalna hai!", "Walks too!", "🐶"),
    ("card", "Par har raasta uske liye nahi hota.", "Par har raasta uske liye nahi hota.", "Not every road", "🚗"),
    ("full", "Milo Onomie se, pets ka apna backpack.", "Milo Onomie se, pets ka apna backpack.", "Meet Onomie", "🎒"),
    ("feature", "Clear dome, hawa ke liye vents, aaram ke liye padded straps.", "Clear dome, hawa ke liye vents, aaram ke liye padded straps.", "Built for comfort", ""),
    ("card", "Ab Bruno, Mishti aur Bunty sab saath.", "Ab Bruno, Mishti aur Bunty sab saath.", "All together", "🐾"),
    ("full", "Onomie. Chalo, saath chalein.", "Onomie. Chalo, saath chalein.", "Chalo, saath chalein", "❤️"),
]


class FakeStoryWriter:
    def write(self, brief: dict, previous: dict | None, feedback: str, log: Log) -> dict:
        log("Fake story writer: building a demo story.")
        topic = brief.get("topic", "a story")
        note = f" (revised: {feedback})" if feedback else ""
        return {
            "title": f"Demo: {topic}"[:60],
            "logline": f"A small story about {topic}.{note}",
            "full_story": f"Act 1: we meet the hero of {topic}. Act 2: everything goes wrong. Act 3: a quiet win.",
            "reel_cut": f"The one-minute cut: the moment the hero of {topic} finally chooses to act.{note}",
        }


class FakeScriptWriter:
    def write(self, brief: dict, image_names: list[str], log: Log) -> dict:
        log("Fake script writer: building a demo script.")
        scenes = []
        for i, (template, vo, roman, headline, sticker) in enumerate(_LINES, 1):
            scenes.append({
                "id": i, "name": f"scene-{i}", "vo_text": vo, "vo_roman": roman, "template": template,
                "image": image_names[0] if image_names else "", "headline": headline,
                "bullets": ["Clear dome", "Air vents", "Padded straps"] if template == "feature" else [],
                "sticker": sticker, "motion": "zoom-in",
            })
        if brief.get("mode") == "story":
            for s in scenes:
                s["template"], s["image"], s["bullets"] = "hook", "", []
        return {"title": f"{brief.get('brand') or brief.get('topic') or 'Story'} demo", "voice_style": "Warm and friendly.",
                "scenes": scenes, "caption": "Demo caption", "hashtags": ["#demo"]}


class FakeVoiceSynth:
    """Writes a quiet tone whose length follows the text, so timing logic can be tested."""

    def synthesize(self, text: str, style: str, voice: str, out_path: Path, log: Log) -> float:
        seconds = max(2.0, round(len(text) * 0.07, 2))
        rate = 24000
        with wave.open(str(out_path), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(rate)
            frames = (struct.pack("<h", int(1500 * math.sin(2 * math.pi * 220 * i / rate))) for i in range(int(rate * seconds)))
            wf.writeframes(b"".join(frames))
        return seconds
