"""Timing maths: how long each scene lasts and when each word is spoken."""
from __future__ import annotations


def _weight(text: str) -> int:
    return max(1, len(text.replace(" ", "")))


def scene_slots(scenes: list[dict], voice_seconds: float) -> list[float]:
    """Split the voice-over across scenes in proportion to how much text each one speaks."""
    weights = [_weight(s.get("vo_text", "")) for s in scenes]
    total = sum(weights)
    return [voice_seconds * w / total for w in weights]


def word_timings(text: str, seconds: float) -> list[dict]:
    """Estimate when each word is spoken inside a scene (longer words take longer)."""
    words = text.split()
    if not words:
        return []
    weights = [len(w) + 1 for w in words]
    total = sum(weights)
    out, t = [], 0.0
    for word, weight in zip(words, weights, strict=True):
        span = seconds * weight / total
        out.append({"w": word, "start": round(t, 3), "end": round(t + span, 3)})
        t += span
    return out
