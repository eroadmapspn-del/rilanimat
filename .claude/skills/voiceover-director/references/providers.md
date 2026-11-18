# Voice providers

| Provider | Needs | Quality | Word timings |
|---|---|---|---|
| `sapi` | Windows (built-in voices) | Plain, clearly synthetic | **measured**: each clause placed from the real pauses in the audio, words inside spread by the synthesizer's relative positions |
| `import` | Your audio file | Best (record yourself or use a studio TTS and download) | exact if you pass `--timings`; otherwise **pause-aligned** |
| `gemini` | `GEMINI_API_KEY`, quota | Natural | **pause-aligned** (the API returns audio only) |

Adding a provider: write a function in `src/reelstudio/production/voice.py` that writes `audio/voice.wav` and returns
`{provider, duration, timing, words:[{w,start,end}], notes}`, register it in `run()` and in `story_file.VOICE_PROVIDERS`.
Any other TTS (ElevenLabs, Azure, Piper) fits by downloading its audio and using `import` with its word timestamps.

## Timings file for `--timings`
`[{"w": "Every", "start": 0.15, "end": 0.5}, ...]` or `{"words": [{"word": "Every", "start": 0.15, "end": 0.5}]}`.
One entry per word of the narration, in order, same count as the script's words. `end` is optional.

## Why not trust a synthesizer's own clock?
Windows SAPI's progress events counted pauses about three times too long in testing, which pushed captions 18 s out of sync over a
52 s reel. The audio file is the ground truth, so alignment starts from its silences.
