"""Image generation with Gemini, with optional reference images (for consistent characters and places).

Every generated file gets a sidecar `<name>.json` that records the model, prompt, reference files and time, and starts as
status "generated". Nothing is "approved" until a person says so (use `approve`).
"""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

from ..config import Settings
from ..errors import ProviderError, QuotaExceeded
from ..providers.gemini.client import make_client, with_retry

IMAGE_MODEL = "gemini-3.1-flash-image"


def generate(settings: Settings, prompt: str, out: Path, refs: list[Path] | None = None,
             aspect: str = "9:16", model: str = IMAGE_MODEL, log=print) -> Path:
    """Generate one image into `out` (PNG). Raises ProviderError if the service returns no image."""
    from google.genai import types

    refs = [Path(r) for r in (refs or [])]
    missing = [str(r) for r in refs if not r.exists()]
    if missing:
        raise ProviderError("Reference image(s) not found: " + ", ".join(missing))
    parts: list = [types.Part.from_bytes(data=r.read_bytes(), mime_type="image/png" if r.suffix == ".png" else "image/jpeg")
                   for r in refs]
    parts.append(prompt)
    client = make_client(settings)
    log(f"Generating {out.name} with {model} ({len(refs)} reference image(s))...")

    def call() -> bytes:
        try:
            response = client.models.generate_content(
                model=model, contents=parts,
                config=types.GenerateContentConfig(response_modalities=["IMAGE"], image_config=types.ImageConfig(aspect_ratio=aspect)),
            )
        except Exception as exc:  # noqa: BLE001 - the SDK raises many types
            text = str(exc)
            if "429" in text and "free_tier" in text and re.search(r"limit: 0\b", text):
                raise QuotaExceeded(f"{model} has no free-tier quota on this API key (limit 0). Enable billing on the key's "
                                    "Google project, or supply the images yourself.") from exc
            raise
        for cand in response.candidates or []:
            for part in (cand.content.parts if cand.content else []) or []:
                if part.inline_data and part.inline_data.data:
                    return part.inline_data.data
        raise RuntimeError("The model returned no image (it may have refused the prompt).")

    data = with_retry(call, log)
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(data)
    out.with_suffix(".json").write_text(json.dumps({
        "status": "generated", "model": model, "prompt": prompt, "references": [str(r) for r in refs],
        "aspect": aspect, "created": time.strftime("%Y-%m-%d %H:%M:%S"),
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    return out


def set_status(image: Path, status: str) -> None:
    """Record a human decision (approved / rejected) next to the image."""
    side = Path(image).with_suffix(".json")
    info = json.loads(side.read_text(encoding="utf-8")) if side.exists() else {}
    info["status"] = status
    info["decided"] = time.strftime("%Y-%m-%d %H:%M:%S")
    side.write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
