---
name: voiceover-director
description: Prepare narration for text-to-speech and produce the voiceover audio with word-level timings, using a configurable provider (local Windows voice, the user's own recording, or Gemini). Use after the script is approved and scenes exist in story.json.
---

# voiceover-director

Stage 4: **voiceover**. Input: approved script already split into `story.json` scenes (storyboard-director can run first with `file: null` visuals).
Provider details: `references/providers.md`.

## Do
1. **Prepare the text.** Check the scene `text` for TTS: numbers, dates and symbols written as words; abbreviations spelled out; unusual names given a respelling in `meta.pronunciations` (and say it aloud-friendly in the text only if the caption will still read right). Punctuation is the pause map: a comma is a short breath, a full stop a longer one, so place them on purpose.
2. **Write delivery notes** in `meta.delivery`: pace, emotion per beat (e.g. "scenes 1-3 hushed, 4-5 urgent, 9 soft"), pauses to hold. Pass pace to the provider (`--rate`) and the style text where the provider supports it.
3. **Run a provider** (ask which one if unclear; default to what works offline):
   - `python -m reelstudio.production voice <folder> --provider sapi --voice-name "Microsoft Zira Desktop" --rate -1`
   - `... --provider import --audio my.mp3 [--timings words.json]` for the user's own or a studio recording
   - `... --provider gemini` only if `GEMINI_API_KEY` is set. Never print or store the key.
4. **Read the result** it prints: duration, timing quality (`measured`, `pause-aligned`, `estimated`) and notes. Report them honestly. If timing is `estimated`, tell the user captions may drift and offer a timings file (Whisper or forced aligner).
5. If the reel is outside 30-60 s, go back to the script (trim or expand) instead of speeding the voice up.
6. Ask the user to **listen** to `audio/voice.wav` and approve before building.

## Rules
- Never claim a provider succeeded unless the command succeeded and `story.json` has `voice.file`.
- Re-run the voice step after any change to scene text.
- Do not use an external TTS service the user has not approved (cost, privacy).
