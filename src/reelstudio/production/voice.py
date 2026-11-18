"""Voice-over for a production: a configurable provider that returns a WAV plus word-level timings.

Providers
- ``sapi``   Windows' built-in voices. Offline, free, measured word timings (robotic, but honest and always available).
- ``import`` Your own recording (any audio file). Pass a word-timings JSON if you have one, otherwise timings are
             ESTIMATED from the text and flagged as such.
- ``gemini`` Gemini TTS through the existing provider. Needs GEMINI_API_KEY. No word timings come back,
             so they are ESTIMATED and flagged. (Not exercised by the offline tests.)

Every provider returns the same dict, which is stored under story["voice"]:
    {provider, file, duration, timing: "measured"|"estimated", words: [{w, start, end}], notes: [...]}
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import tempfile
import unicodedata
from pathlib import Path

from ..errors import InvalidInput, ProviderError
from ..media import ffmpeg
from . import story_file

SAPI_SCRIPT = Path(__file__).resolve().parents[3] / "tools" / "sapi_tts.ps1"


def _norm(token: str) -> str:
    """Letters, vowel signs and digits only (Python's word class drops Devanagari matras, so check the Unicode category)."""
    return "".join(c for c in token if unicodedata.category(c)[0] in "LMN").lower()


def _finish_words(raw: list[dict], duration: float) -> list[dict]:
    """Give every word an end time: the next word's start, unless a long pause follows."""
    words = []
    for i, item in enumerate(raw):
        start = float(item["start"])
        nxt = float(raw[i + 1]["start"]) if i + 1 < len(raw) else duration
        end = float(item["end"]) if item.get("end") is not None else (nxt if nxt - start <= 0.7 else start + 0.5)
        words.append({"w": item["w"], "start": round(start, 3), "end": round(max(end, start + 0.05), 3)})
    return words


def restore_punctuation(text: str, words: list[dict]) -> tuple[list[dict], list[str]]:
    """SAPI strips punctuation. Put it back by matching the script's tokens against the spoken words in order."""
    tokens = text.split()
    notes: list[str] = []
    if len(tokens) == len(words) and all(_norm(t) == _norm(w["w"]) or not _norm(w["w"]) for t, w in zip(tokens, words, strict=True)):
        return [{**w, "w": t} for t, w in zip(tokens, words, strict=True)], notes
    notes.append(
        f"Script has {len(tokens)} words but the voice spoke {len(words)}; captions keep the spoken words without punctuation. "
        "Write numbers and symbols out as words (e.g. 'nineteen eighty one') so they line up."
    )
    return words, notes


def estimate_words(text: str, duration: float, lead: float = 0.15, tail: float = 0.25) -> list[dict]:
    """Spread the words across the audio by length. Only used when real timings are not available."""
    tokens = text.split()
    if not tokens:
        return []
    span = max(0.1, duration - lead - tail)
    weights = [len(_norm(t)) + 1 for t in tokens]
    total = sum(weights)
    out, t = [], lead
    for token, weight in zip(tokens, weights, strict=True):
        step = span * weight / total
        out.append({"w": token, "start": round(t, 3), "end": round(t + step, 3)})
        t += step
    return out


_CLAUSE_END = re.compile(r"[,.;:!?…।॥—–]$")  # includes the Hindi danda and dashes


def _speech_segments(wav: Path, duration: float, noise_db: int, min_pause: float) -> list[tuple[float, float]]:
    """Stretches of real speech in the audio, found from its silences (the audio is the ground truth)."""
    run = subprocess.run(  # noqa: S603
        [ffmpeg.FFMPEG, "-hide_banner", "-i", str(wav), "-af", f"silencedetect=noise={noise_db}dB:d={min_pause}", "-f", "null", "-"],
        capture_output=True, text=True, encoding="utf-8", errors="replace")
    starts = [float(x) for x in re.findall(r"silence_start:\s*(-?[\d.]+)", run.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end:\s*([\d.]+)", run.stderr)]
    segs, cursor = [], 0.0
    for i, st in enumerate(starts):
        if st - cursor > 0.08:
            segs.append((cursor, max(st, cursor)))
        cursor = ends[i] if i < len(ends) else duration
    if duration - cursor > 0.08:
        segs.append((cursor, duration))
    return segs


def _group_segments(segs: list[tuple[float, float]], clause_weights: list[float]) -> list[list[tuple[float, float]]] | None:
    """Split the speech stretches into one consecutive group per clause so that each group's share of the speech time
    best matches its clause's share of the text (dynamic programming). None if there are fewer stretches than clauses."""
    n, m = len(clause_weights), len(segs)
    if m < n:
        return None
    total_w, total_t = sum(clause_weights), sum(e - s for s, e in segs)
    prefix = [0.0]
    for s, e in segs:
        prefix.append(prefix[-1] + (e - s))
    inf = float("inf")
    cost = [[inf] * (m + 1) for _ in range(n + 1)]
    back = [[0] * (m + 1) for _ in range(n + 1)]
    cost[0][0] = 0.0
    for c in range(1, n + 1):
        want = clause_weights[c - 1] / total_w
        for j in range(c, m + 1):
            for k in range(c - 1, j):
                if cost[c - 1][k] == inf:
                    continue
                got = (prefix[j] - prefix[k]) / total_t
                value = cost[c - 1][k] + (got - want) ** 2
                if value < cost[c][j]:
                    cost[c][j], back[c][j] = value, k
    groups, j = [], m
    for c in range(n, 0, -1):
        k = back[c][j]
        groups.append(segs[k:j])
        j = k
    return groups[::-1]


def _time_at(frac: float, group: list[tuple[float, float]]) -> float:
    """The real time at `frac` (0..1) of the speech inside a group, skipping the silent gaps between its stretches."""
    pos = frac * sum(e - s for s, e in group)
    for s, e in group:
        if pos <= e - s:
            return s + pos
        pos -= e - s
    return group[-1][1]


def align_by_pauses(tokens: list[str], wav: Path, duration: float, offsets: list[float] | None = None) -> list[dict] | None:
    """Place every word using the real pauses in the audio.

    The script is cut into clauses at punctuation. The audio is cut into speech stretches at its silences, and the
    stretches are grouped to the clauses by best fit (a voice may pause where the script has no punctuation). Words are
    then spread across the speech inside each clause by `offsets` (relative positions from a synthesizer, if given) or
    by word length, skipping silent gaps. Returns None when the audio cannot be matched.
    """
    ranges, first = [], 0
    for i, token in enumerate(tokens):
        if _CLAUSE_END.search(token) or i == len(tokens) - 1:
            ranges.append((first, i + 1))
            first = i + 1
    weights_all = [len(_norm(t)) + 1.0 for t in tokens]
    clause_w = [sum(weights_all[a:b]) for a, b in ranges]
    groups = None
    for noise_db, min_pause in ((-40, 0.3), (-38, 0.25), (-42, 0.35), (-35, 0.3), (-45, 0.3), (-40, 0.2), (-40, 0.4)):
        segs = _speech_segments(wav, duration, noise_db, min_pause)
        if len(segs) == len(ranges):
            groups = [[s] for s in segs]  # a perfect one-to-one match, nothing to guess
            break
        if groups is None and len(segs) > len(ranges):
            groups = _group_segments(segs, clause_w)
    if groups is None:
        return None
    out: list[dict] = []
    for (a, b), group in zip(ranges, groups, strict=True):
        w = weights_all[a:b]
        if offsets is not None and b - a > 1 and offsets[b - 1] > offsets[a]:
            span = offsets[b - 1] - offsets[a] + w[-1] * 0.075
            rel = [(offsets[k] - offsets[a]) / span for k in range(a, b)] + [1.0]
        else:
            rel, acc = [0.0], 0.0
            for x in w:
                acc += x / sum(w)
                rel.append(acc)
        for k, token in enumerate(tokens[a:b]):
            out.append({"w": token, "start": round(_time_at(rel[k], group), 3), "end": round(_time_at(rel[k + 1], group), 3)})
    return out


def read_timings_file(path: Path) -> list[dict]:
    """Accept [{w|word|text, start, end?}] or {"words": [...]} (Whisper / forced-aligner style)."""
    data = json.loads(Path(path).read_text(encoding="utf-8-sig"))
    items = data.get("words") if isinstance(data, dict) else data
    if not isinstance(items, list) or not items:
        raise InvalidInput(f"{path} has no word list.")
    raw = []
    for it in items:
        word = it.get("w") or it.get("word") or it.get("text")
        if word is None or it.get("start") is None:
            raise InvalidInput("Each timing entry needs a word (w / word / text) and a start time in seconds.")
        raw.append({"w": str(word).strip(), "start": it["start"], "end": it.get("end")})
    return raw


# ---------------------------------------------------------------------------------------------- providers
def synthesize_sapi(text: str, out_wav: Path, voice_name: str = "", rate: int = 0) -> dict:
    if not shutil.which("powershell"):
        raise ProviderError("The 'sapi' voice needs Windows PowerShell. Use --provider import with your own recording instead.")
    with tempfile.TemporaryDirectory() as tmp:
        txt, js = Path(tmp) / "in.txt", Path(tmp) / "words.json"
        txt.write_text(text, encoding="utf-8")
        cmd = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(SAPI_SCRIPT),
               "-TextFile", str(txt), "-Out", str(out_wav), "-Json", str(js), "-Rate", str(rate)]
        if voice_name:
            cmd += ["-Voice", voice_name]
        run = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")  # noqa: S603
        if run.returncode != 0 or not js.exists():
            raise ProviderError("Windows text-to-speech failed: " + (run.stderr or run.stdout)[-300:])
        raw = json.loads(js.read_text(encoding="utf-8-sig"))
    duration = ffmpeg.duration(out_wav)
    tokens = text.split()
    words, notes = restore_punctuation(text, _finish_words(raw, duration))
    aligned = None
    if len(raw) == len(tokens):
        # SAPI's own clock over-counts pauses, so only its relative word positions inside a clause are used.
        aligned = align_by_pauses(tokens, out_wav, duration, [float(r["start"]) for r in raw])
    if aligned:
        return {"provider": "sapi", "voiceName": voice_name or "default", "duration": round(duration, 3),
                "timing": "measured", "words": aligned, "notes": notes}
    notes.append("Could not match the script's punctuation to the pauses in the audio. Timings are the synthesizer's own and may drift.")
    return {"provider": "sapi", "voiceName": voice_name or "default", "duration": round(duration, 3),
            "timing": "estimated", "words": words, "notes": notes}


def import_audio(text: str, audio: Path, out_wav: Path, timings: Path | None = None) -> dict:
    duration = ffmpeg.to_wav(Path(audio), out_wav)
    if timings:
        raw = read_timings_file(timings)
        words = _finish_words(raw, duration)
        words, notes = restore_punctuation(text, words)
        return {"provider": "import", "duration": round(duration, 3), "timing": "measured", "words": words, "notes": notes}
    aligned = align_by_pauses(text.split(), out_wav, duration)
    if aligned:
        return {"provider": "import", "duration": round(duration, 3), "timing": "pause-aligned", "words": aligned,
                "notes": ["No word timings supplied: each clause is placed from the real pauses in your audio and words inside "
                          "a clause are spread by length. Pass --timings (Whisper or a forced aligner) for exact words."]}
    return {"provider": "import", "duration": round(duration, 3), "timing": "estimated",
            "words": estimate_words(text, duration),
            "notes": ["No word timings supplied and the pauses did not match the punctuation: captions are spread by word "
                      "length and may drift. Pass --timings (Whisper or a forced aligner) for exact captions."]}


def synthesize_gemini(text: str, out_wav: Path, voice_name: str, style: str, settings) -> dict:
    from ..providers.gemini import GeminiVoiceSynth

    seconds = GeminiVoiceSynth(settings).synthesize(text, style, voice_name or "Kore", out_wav, print)
    aligned = align_by_pauses(text.split(), out_wav, seconds)
    return {"provider": "gemini", "voiceName": voice_name or "Kore", "duration": round(seconds, 3),
            "timing": "pause-aligned" if aligned else "estimated", "words": aligned or estimate_words(text, seconds),
            "notes": ["Gemini TTS returns no word timings: clauses are placed from the audio's pauses, words inside by length."]}


def run(folder: Path, provider: str, *, audio: Path | None = None, timings: Path | None = None,
        voice_name: str = "", rate: int = 0, style: str = "", settings=None) -> dict:
    """Create the voice-over for a production and store it in story.json."""
    folder = Path(folder)
    story = story_file.load(folder)
    bad = story_file.problems(story)
    if bad:
        raise InvalidInput("story.json is not ready:\n- " + "\n- ".join(bad))
    text = story_file.narration(story)
    (folder / "audio").mkdir(exist_ok=True)
    out = folder / "audio" / "voice.wav"
    if provider == "sapi":
        info = synthesize_sapi(text, out, voice_name, rate)
    elif provider == "import":
        if not audio:
            raise InvalidInput("--audio is required with --provider import.")
        info = import_audio(text, audio, out, timings)
    elif provider == "gemini":
        if settings is None:
            from ..config import load_settings
            settings = load_settings()
        style = style or story.get("meta", {}).get("delivery", "")
        info = synthesize_gemini(text, out, voice_name, style, settings)
    else:
        raise InvalidInput(f"Unknown voice provider '{provider}'. Choose one of {', '.join(story_file.VOICE_PROVIDERS)}.")
    info["file"] = "audio/voice.wav"
    story["voice"] = info
    story_file.save(folder, story)
    return info
