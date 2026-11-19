# Hindi voiceover and video workflow

1. Read `CONTINUITY_BIBLE.json`, then open only `episodes/ep-NNN/episode.json`.
2. Approve narration before spending voice/image credits. Treat story as FICTION, not investigative reporting about real people.
3. Set the TTS provider/voice ID in an environment variable. Use a supported Hindi voice and keep the same voice for the season. Never hard-code API keys.
4. Render `narration_hi` verbatim to an audio file. Never claim a WAV/MP3 file exists before it is actually created.
5. Obtain provider-aligned word timestamps where offered, or align the synthesized audio with a verified Hindi-capable aligner. If word alignment is unavailable, fall back to sentence captions; never fabricate accurate timestamps.
6. Measure the audio length using an audio probe. Target 58–62 seconds. If long, edit the script and resynthesize; do not heavily speed up speech. If short, prefer subtle pauses, room ambience, or natural script additions; avoid prolonged silent image holds.
7. Map the scene voiceover text to timestamp ranges, overriding the editorial 0–20/20–40/40–60 estimates. The scene voiceover segments in episode JSON must concatenate to precisely the narration text (whitespace-normalized).
8. Generate three first-pass vertical cinematic stills per episode at matching character/location references. Add Remotion slow pan/zoom/parallax using `interpolate()`, `spring()`, and frame-based timing. Use media permissions and avoid unlicensed copyrighted clips.
9. Caption in Devanagari with a bundled render-safe font (do not redistribute font files), 2–5 words per on-screen group, inside safe zones. QA Hindi punctuation, spelling, names, and text cropping.
10. Duck soundtrack under the voiceover, avoid overpowering sound effects, preserve dialogue clarity, check peak/loudness and music rights.
11. Review frame 1, mid-frame, last frame and full audio in Remotion Studio; render 1080×1920 MP4 at 30 fps with audio.
12. Keep `production.*_status` accurate. Only set to generated or rendered after the corresponding files exist and validate. Publish is separate, manual by default.

## Production status machine
script: draft -> reviewed -> approved
voice: not_generated -> generated -> validated
image: not_generated -> generated -> approved
render: not_generated -> rendered -> quality_checked

## Audience participation
Viewer predictions go in the pinned comment or an optional end card. They are not canon-changing votes. Never reveal future clues in poll copy. Avoid manipulating suspense with false claims that this fictional story happened.
