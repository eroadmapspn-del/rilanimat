# तेरहवीं घंटी — Hindi Mystery Season

A **complete authored fictional season**: 60 Hindi voiceover scripts (6019 total space-delimited words), 180 planned cinematic still-image shots, audience prompts, story continuity and JSON templates.

**Files:**
- `FULL_60_EPISODE_STORY.md`: the entire season readable episode by episode, including scripts and scenes.
- `series.json`: all 60 machine-readable episodes plus the cast and tracked clues.
- `episodes/ep-XXX/episode.json`: one episode per file for Claude Code and Remotion pipelines.
- `CONTINUITY_BIBLE.json`: canonical reveal tracking.
- `episode.schema.json`: a basic JSON schema for episode validation.
- `VOICEOVER_AND_REMOTION_WORKFLOW.md`: voice and rendering workflow.
- `CLAUDE.md`: project working conventions.

**Important:** Narration length has not yet been checked with real Hindi TTS, so 60 seconds/episode is a target, not a measured guarantee. No MP3/WAV, actual cinematic images or MP4 are included.

**Suggested next task in Claude Code:** Read CLAUDE.md; use ep-001/episode.json as script source, implement one Hindi TTS adapter and word-timing alignment, create 3 consistent cinematic images, render one 60-second preview through Remotion and measure actual duration. Do not modify the season's later reveal gates.
