# CLAUDE.md — तेरहवीं घंटी

You are producing a **fictional 60-part Hindi mystery season**. This package contains scripts, a story continuity bible and three storyboard shots per episode. It does NOT contain rendered voice, generated images, or MP4 files.

At the start of each episode: read `CONTINUITY_BIBLE.json` and only the current/previous episode JSON. Honor `reveal_gates`; do not accidentally expose the solution early. Do not confuse planned story canon with confirmed real-world facts.

Do not rewrite the whole season unless asked. Preserve exact character IDs, plot mechanics, timeline and approved narration. Each episode aims for ~60 seconds but needs measured Hindi TTS. Production status must not be marked complete before actual files exist.

For voice and visuals read `VOICEOVER_AND_REMOTION_WORKFLOW.md`.

Output per episode: approved Hindi VO, measured timings, scenes with images/assets, caption segments, QA report, rendered MP4 if tools and credentials actually exist. Avoid unnecessary repository-wide file scans.
