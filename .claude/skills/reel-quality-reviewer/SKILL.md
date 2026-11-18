---
name: reel-quality-reviewer
description: Review a storytelling reel production for hook, story, pacing, captions, timing, transitions, audio levels, safe margins and spelling, and verify the final MP4. Use before showing a render as final, and after every re-render.
---

# reel-quality-reviewer

Stage 9: **quality review -> final MP4**. Run it on drafts too; fix, then review again.

## Do
1. Run the mechanical checks and read every line:
   `python -m reelstudio.production review productions/<slug>` (add `--video` once `out/reel.mp4` exists).
   Exit code 1 means errors. Warnings are judgment calls: fix them or say why you accept them.
2. Then review what a script cannot judge. Use `references/checklist.md`:
   - **Hook**: clear in the first 3 seconds? Concrete rather than generic?
   - **Story**: conflict, escalation, turn, satisfying last beat? Any filler, repetition, AI-sounding phrases, engagement bait?
   - **Facts**: every claim matches `research.md` status; nothing unverified stated as fact; fiction labelled.
   - **Spelling**: proofread the caption word list the tool prints, names included.
3. Look at the picture. Extract frames at scene starts and mid-scene (`ffmpeg -ss <t> -i out/reel.mp4 -frames:v 1 f.png`), view them, and check: captions readable and inside safe margins, no clipped text, no placeholder or blank scenes, transitions not jarring, variety between scenes.
4. Check audio: voice clearly above music, music ducks under speech, loudness near -14 LUFS, no clipping (the `--video` check reports these).
5. Write `review.md`: verdict (ship / fix first), the list of errors and warnings with what you did, and anything still open. Be specific. Do not write "looks good" without having looked.

## Rules
- Never call a reel final while any scene is `placeholder`, any asset is missing, or timing is `estimated`, unless the user accepted that in writing in this conversation.
- Verify by running the tools; do not assume a render succeeded because the command was issued.
- Report problems plainly, including ones you introduced.
