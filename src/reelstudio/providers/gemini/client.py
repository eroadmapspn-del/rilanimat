"""Shared Gemini plumbing: client creation and retry with typed errors."""
from __future__ import annotations

import time
from collections.abc import Callable
from typing import TypeVar

from google import genai

from ...config import Settings
from ...errors import ProviderError, QuotaExceeded, ReelStudioError

T = TypeVar("T")
TIMEOUT_MS = 120_000


def make_client(settings: Settings) -> genai.Client:
    if not settings.gemini_api_key:
        raise ProviderError("GEMINI_API_KEY is missing in .env")
    return genai.Client(api_key=settings.gemini_api_key, http_options={"api_version": "v1beta", "timeout": TIMEOUT_MS})


def with_retry(fn: Callable[[], T], log: Callable[[str], None], attempts: int = 3) -> T:
    """Call fn, retrying with a pause (65s when rate limited). Raises QuotaExceeded or ProviderError."""
    for attempt in range(1, attempts + 1):
        try:
            return fn()
        except ReelStudioError:
            raise
        except Exception as exc:  # noqa: BLE001 - the SDK raises many different types
            message = str(exc)
            limited = "429" in message or "RESOURCE_EXHAUSTED" in message
            log(f"attempt {attempt}/{attempts} failed: {message[:200]}")
            if attempt == attempts:
                if limited:
                    raise QuotaExceeded(
                        "Gemini quota reached. The free tier allows only a few requests per minute and per day. "
                        "Wait and try again, or enable billing on your API project."
                    ) from exc
                raise ProviderError(message[:400]) from exc
            time.sleep(65 if limited else 5 * attempt)
    raise AssertionError("unreachable")
