"""One typed Settings object, built once at startup from environment variables and .env."""
from __future__ import annotations

import os
from dataclasses import dataclass, replace
from pathlib import Path

from dotenv import load_dotenv

APP_ROOT = Path(__file__).resolve().parents[2]  # the reel-studio/ folder


@dataclass(frozen=True)
class Settings:
    provider: str  # "gemini" (real) or "fake" (offline demo, used by the tests)
    gemini_api_key: str
    text_model: str
    tts_model: str
    data_dir: Path  # projects live here
    remotion_dir: Path
    assets_dir: Path  # default product photos
    web_dir: Path
    host: str = "127.0.0.1"
    port: int = 5000
    max_upload_mb: int = 1024

    def with_overrides(self, **kw) -> Settings:
        return replace(self, **kw)

    def missing(self) -> list[str]:
        """Names of required settings that are empty (only the real provider needs keys)."""
        if self.provider != "gemini":
            return []
        need = {
            "GEMINI_API_KEY": self.gemini_api_key,
            "GEMINI_TEXT_MODEL": self.text_model,
            "GEMINI_TTS_MODEL": self.tts_model,
        }
        return [name for name, value in need.items() if not value]


def load_settings(env_file: Path | None = None) -> Settings:
    load_dotenv(env_file or APP_ROOT / ".env")
    env = os.environ.get
    return Settings(
        provider=(env("REELSTUDIO_PROVIDER") or "gemini").strip().lower(),
        gemini_api_key=(env("GEMINI_API_KEY") or "").strip(),
        text_model=(env("GEMINI_TEXT_MODEL") or "gemini-2.5-flash").strip(),
        tts_model=(env("GEMINI_TTS_MODEL") or "").strip(),
        data_dir=Path(env("REELSTUDIO_DATA_DIR") or APP_ROOT / "projects"),
        remotion_dir=APP_ROOT / "remotion",
        assets_dir=APP_ROOT / "assets" / "product_images",
        web_dir=APP_ROOT / "web",
        host=env("REELSTUDIO_HOST") or "127.0.0.1",
        port=int(env("REELSTUDIO_PORT") or 5000),
    )
