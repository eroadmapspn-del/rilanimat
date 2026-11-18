"""The story writer: invents a creative story for a topic, and revises it from the user's chat feedback."""
from __future__ import annotations

import json

from ...config import Settings
from ...errors import ProviderError
from ..base import Log
from .client import make_client, with_retry

PROMPT = """You are an award-winning story writer. A creator wants a ONE-MINUTE Instagram Reel on a topic.

Think of the story as a full feature film of about 2 hours with real characters, a conflict and an emotional
turn. The reel will show only ONE gripping minute of it, so the film must be rich enough that this minute
makes people want to know the rest. Be original and creative. Avoid cliches and generic morals.

TOPIC FROM THE CREATOR: {topic}
LANGUAGE OF THE AUDIENCE: {language}
REEL LENGTH: about {duration} seconds of narration
EXTRA NOTES: {notes}
{revision}
Return ONLY valid JSON with exactly this shape:
{{
  "title": "short, catchy title",
  "logline": "one sentence that sells the story",
  "full_story": "the whole 2-hour story told briefly, act by act (3 acts, about 120-180 words). Name the characters.",
  "reel_cut": "the one-minute reel version in 5-8 sentences: which moment we show, how it opens with a hook, builds, and ends on a twist or feeling that leaves people wanting more. Narration only, no camera directions."
}}
Write these fields in simple English so the creator can review them, even if the reel will be in another language."""

REVISION = """
THE CURRENT STORY (the creator has read it):
{previous}

THE CREATOR'S CHANGE REQUEST: {feedback}
Apply the request faithfully. Keep what they did not ask to change.
"""


class GeminiStoryWriter:
    def __init__(self, settings: Settings):
        self.settings = settings

    def write(self, brief: dict, previous: dict | None, feedback: str, log: Log) -> dict:
        revision = ""
        if previous and feedback:
            revision = REVISION.format(previous=json.dumps(previous, ensure_ascii=False, indent=2), feedback=feedback)
        prompt = PROMPT.format(
            topic=brief.get("topic", ""), language=brief.get("language", "Hinglish"),
            duration=int(brief.get("duration", 55)), notes=brief.get("notes") or "none", revision=revision,
        )
        client = make_client(self.settings)
        model = self.settings.text_model
        log(f"Asking {model} to {'revise' if revision else 'write'} the story...")

        def call() -> dict:
            response = client.models.generate_content(
                model=model, contents=prompt, config={"response_mime_type": "application/json"}
            )
            text = (response.text or "").strip()
            if text.startswith("```"):
                text = text.strip("`").removeprefix("json").strip()
            try:
                return json.loads(text)
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"The model did not return valid JSON: {exc}") from exc

        data = with_retry(call, log)
        if not isinstance(data, dict) or not data.get("reel_cut"):
            raise ProviderError("The model returned an unexpected story format.")
        return {k: str(data.get(k, "")).strip() for k in ("title", "logline", "full_story", "reel_cut")}
