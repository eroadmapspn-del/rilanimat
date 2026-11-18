"""Small ffmpeg helpers (the binary ships with the imageio-ffmpeg package)."""
from __future__ import annotations

import re
import subprocess
from pathlib import Path

import imageio_ffmpeg

from ..errors import InvalidMedia

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def _run(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run([FFMPEG, "-hide_banner", *args], capture_output=True, text=True, encoding="utf-8", errors="replace")


def duration(path: Path) -> float:
    """Length in seconds of any audio or video file. Raises InvalidMedia if it cannot be read."""
    p = _run(["-i", str(path)])
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", p.stderr)
    if not m:
        raise InvalidMedia(f"{path.name} could not be read as media.")
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)


def to_wav(src: Path, dest: Path) -> float:
    """Convert any audio to mono 44.1 kHz WAV. Returns its length in seconds."""
    p = _run(["-y", "-i", str(src), "-vn", "-ac", "1", "-ar", "44100", str(dest)])
    if p.returncode != 0:
        raise InvalidMedia("That file could not be read as audio: " + p.stderr[-160:])
    return duration(dest)
