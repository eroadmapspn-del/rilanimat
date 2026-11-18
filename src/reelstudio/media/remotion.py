"""Run the Remotion renderer (Node) and report its progress."""
from __future__ import annotations

import os
import re
import shutil
import subprocess
import time
from collections.abc import Callable
from pathlib import Path

from ..errors import RenderError

RENDER_TIMEOUT_SECONDS = 30 * 60
_ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
_PROGRESS = re.compile(r"(Rendered|Stitched|Encoded)\s+(\d+)/(\d+)")


def check(remotion_dir: Path) -> dict:
    """What the UI needs to show if rendering is not set up yet."""
    return {
        "node": bool(shutil.which("node")),
        "installed": (remotion_dir / "node_modules" / "remotion").exists(),
    }


def _npx() -> str:
    npx = shutil.which("npx")
    if not npx:
        raise RenderError("Node.js was not found. Install Node.js 18 or newer from nodejs.org, then restart the app.")
    return npx


def render(
    remotion_dir: Path,
    props_file: Path,
    public_dir: Path,
    out_file: Path,
    *,
    draft: bool = False,
    composition: str = "Reel",
    on_progress: Callable[[float], None] = lambda pct: None,
) -> None:
    """Render a composition (default 'Reel') to out_file. Progress is 0-100."""
    status = check(remotion_dir)
    if not status["installed"]:
        raise RenderError("Video templates are not installed. Run:  cd remotion  &&  npm install")
    cmd = [
        _npx(), "remotion", "render", "src/index.ts", composition, str(out_file),
        f"--props={props_file}", f"--public-dir={public_dir}", "--log=info",
    ]
    if draft:
        cmd += ["--scale=0.5", "--crf=28"]
    env = {**os.environ, "FORCE_COLOR": "0", "NO_COLOR": "1"}
    proc = subprocess.Popen(  # noqa: S603 - fixed argument list, no shell
        cmd, cwd=remotion_dir, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=env,
    )
    tail: list[str] = []
    started = time.time()
    buffer = b""
    assert proc.stdout is not None
    while True:
        chunk = proc.stdout.read1(4096) if hasattr(proc.stdout, "read1") else proc.stdout.read(4096)
        if not chunk:
            break
        buffer += chunk
        *lines, buffer = re.split(rb"[\r\n]", buffer)
        for raw in lines:
            line = _ANSI.sub("", raw.decode("utf-8", errors="replace")).strip()
            if not line:
                continue
            m = _PROGRESS.search(line)
            if m:
                kind, done, total = m.group(1), int(m.group(2)), max(1, int(m.group(3)))
                share = done / total
                on_progress(share * 85 if kind == "Rendered" else 85 + share * 15)
            else:
                tail = (tail + [line])[-12:]
        if time.time() - started > RENDER_TIMEOUT_SECONDS:
            proc.kill()
            raise RenderError("Rendering took longer than 30 minutes and was stopped.")
    code = proc.wait()
    if code != 0 or not out_file.exists():
        raise RenderError("Remotion failed:\n" + "\n".join(tail[-8:]))
    on_progress(100)
