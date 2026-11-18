"""Writes the reel script (voice-over plus a visual plan for each scene) with a Gemini text model."""
from __future__ import annotations

import json

from ...config import Settings
from ...errors import ProviderError
from ..base import Log
from .client import make_client, with_retry

PROMPT = """You are a viral short-form video scriptwriter for Indian Instagram Reels and product-selling ads.

The reel is an animated product ad built from the seller's real product photos, big animated headlines,
emoji stickers and captions. There is NO AI-generated footage, so never describe characters moving.

BRAND: {brand}
PRODUCT: {product}
REAL PRODUCT FEATURES (only mention these, never invent features): {features}
THEME / CHARACTERS TO MENTION IN THE STORY: {pets}
TARGET LENGTH: about {duration} seconds of voice-over (natural pace)
VOICE-OVER LANGUAGE: {language}
TONE: {tone}
TAGLINE: {tagline}
CALL TO ACTION: {cta}
EXTRA NOTES: {notes}
AVAILABLE PRODUCT PHOTOS (file names): {images}

Rules:
- Structure: strong hook in the first 3 seconds, a relatable problem, the product reveal, 2-3 real features, a happy payoff, then the brand and tagline.
- The voice-over is ONE continuous narration split across 5-7 scenes. Natural, warm, conversational. Never a whisper.
- {language_rule}
- Total spoken words must fit about {duration} seconds ({words} words maximum).
- template, per scene, must be one of:
    "hook"    big headline text on a colour background (use for scene 1 and for the problem)
    "full"    a product photo fills the screen (use for the reveal and the final payoff)
    "card"    a product photo in a card with a headline above
    "feature" a photo plus 2-3 short feature chips (put them in "bullets", max 3 words each, only real features)
- image: one file name from the available photos list (or "" for a hook with no photo).
- headline: 2-5 words, Roman letters, shown big on screen.
- sticker: ONE emoji that fits the moment (or "").
- motion: one of "zoom-in", "zoom-out", "pan-left", "pan-right", "pan-up".

Return ONLY valid JSON with exactly this shape:
{{
  "title": "short internal title",
  "voice_style": "one sentence describing how the narrator should sound",
  "scenes": [
    {{
      "id": 1,
      "name": "short-slug",
      "vo_text": "the exact words spoken in this scene",
      "vo_roman": "same words in Roman letters (used for captions)",
      "template": "hook",
      "image": "",
      "headline": "...",
      "bullets": [],
      "sticker": "🐶",
      "motion": "zoom-in"
    }}
  ],
  "caption": "Instagram caption with emojis",
  "hashtags": ["#..."]
}}"""


STORY_PROMPT = """You are a master short-form storyteller and scriptwriter for Instagram Reels.

The creator approved this story. Turn its one-minute cut into the reel script.

TITLE: {title}
LOGLINE: {logline}
THE WHOLE STORY (for context and character names): {full_story}
THE ONE-MINUTE CUT TO SCRIPT: {reel_cut}
VOICE-OVER LANGUAGE: {language}
TARGET LENGTH: about {duration} seconds of voice-over ({words} words maximum)
EXTRA NOTES: {notes}

The reel is built from animated big text on colour, emoji stickers and captions. There is NO footage and NO
AI video, so the voice-over carries the story. Make the words vivid and emotional, with a hook in the first 3 seconds.

Rules:
- ONE continuous narration split across 8-12 scenes of about 4-7 seconds each.
- {language_rule}
- template is "hook" for every scene (big headline text on a colour background){clip_note}.
- headline: 2-5 words, Roman letters, the punch of that moment.
- sticker: ONE emoji that fits the moment.
- visual_note: one short line saying what the viewer should picture or feel in that scene (a note to the creator, not spoken).
- motion: one of "zoom-in", "zoom-out", "pan-left", "pan-right", "pan-up".
- image is always "".

Return ONLY valid JSON with exactly this shape:
{{
  "title": "short internal title",
  "voice_style": "one sentence describing how the narrator should sound",
  "scenes": [
    {{"id": 1, "name": "short-slug", "vo_text": "exact words spoken", "vo_roman": "same words in Roman letters",
      "template": "hook", "image": "", "headline": "...", "bullets": [], "sticker": "🌙",
      "visual_note": "...", "motion": "zoom-in"}}
  ],
  "caption": "Instagram caption with emojis",
  "hashtags": ["#..."]
}}"""


class GeminiScriptWriter:
    def __init__(self, settings: Settings):
        self.settings = settings

    def write(self, brief: dict, image_names: list[str], log: Log) -> dict:
        duration = int(brief.get("duration", 26))
        language = brief.get("language", "Hinglish")
        if language == "English":
            rule = "Write the voice-over in simple, friendly English."
        else:
            rule = (
                "Write vo_text in Devanagari script (natural Hinglish: Hindi with common English words written "
                "in Devanagari). Write the brand name as it should be pronounced in Devanagari."
            )
        if brief.get("mode") == "story":
            story = brief.get("story") or {}
            prompt = STORY_PROMPT.format(
                title=story.get("title", ""), logline=story.get("logline", ""), full_story=story.get("full_story", ""),
                reel_cut=story.get("reel_cut", ""), language=language, language_rule=rule, duration=duration,
                words=int(duration * 2.4), notes=brief.get("notes") or "none",
                clip_note=" (the creator may later replace scenes with their own clips)",
            )
        else:
            prompt = self._product_prompt(brief, image_names, duration, language, rule)
        client = make_client(self.settings)
        model = self.settings.text_model
        log(f"Asking {model} to write the script...")
        return self._call(client, model, prompt, log)

    def _product_prompt(self, brief: dict, image_names: list[str], duration: int, language: str, rule: str) -> str:
        return PROMPT.format(
            brand=brief.get("brand", ""), product=brief.get("product", ""), features=brief.get("features", ""),
            pets=brief.get("pets", "") or "none", duration=duration, language=language, language_rule=rule,
            tone=brief.get("tone") or "emotional, funny, then joyful", tagline=brief.get("tagline", ""),
            cta=brief.get("cta") or "Shop now, link in bio", notes=brief.get("notes") or "none",
            images=", ".join(image_names) or "none", words=int(duration * 2.4),
        )

    @staticmethod
    def _call(client, model: str, prompt: str, log: Log) -> dict:
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
        if not isinstance(data, dict):
            raise ProviderError("The model returned an unexpected script format.")
        return data
