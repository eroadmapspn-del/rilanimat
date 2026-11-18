---
name: storyboard-director
description: Turn an approved script into cinematic scenes in story.json, with visual prompts, camera moves, atmosphere and transitions, for AI images, stock footage or the user's own files. Use after the script is approved, and again to fill in assets.
---

# storyboard-director

Stage 5-6: **storyboard -> assets**. Input: approved `script.md`. Output: `productions/<slug>/story.json`.
Field reference: `references/story-json.md` (read it before writing the file).

## Do
1. Split the script into 7-12 scenes of about 3-8 seconds. Each scene's `text` is the exact words spoken in it; the scene texts joined are the narration. Never put words in `text` that the script does not contain.
2. Write a **style bible** once, in `meta.style` (palette, lens, light, era, medium) and reuse it in every prompt. Name recurring characters and places once (`meta.characters`, `meta.locations`) with fixed visual descriptors, and repeat those descriptors verbatim for consistency.
3. For each scene set `visual`:
   - `prompt`: subject, framing (wide / medium / close), light, mood, and the style bible. Vertical 9:16. No text or logos in the image.
   - `camera`: one of push-in, pull-out, pan-left, pan-right, tilt-up, tilt-down, drift, static. Alternate; do not repeat the same move twice in a row.
   - `atmosphere`: `tint` hex and `dim` 0-0.5 for mood.
   - `transition` into the scene: fade, slide-up, slide-left, zoom, cut. Prefer fade and cut; use slide/zoom at the story's turns.
4. Vary the visuals: change framing (wide -> close -> detail), location or light between scenes. No two consecutive scenes with the same composition.
5. Assets, in this order of preference: files the user supplied (`source: "user"`), licensed stock (`source: "stock"`, record `license` and URL), AI-generated (`source: "ai-generated"`, record the tool). Put files in `images/` or `video/` and set `visual.file`.
6. If an asset is missing, leave `file: null` or run `python -m reelstudio.production placeholders <folder>`, which draws clearly labelled placeholders (`source: "placeholder"`). Never present a placeholder as generated art.

## Stop
Show the storyboard as a table (scene, narration, framing, camera, transition). **Ask approval before any paid image or video generation**, and state the number of calls and the provider. Generate only after a yes. If a call fails, report the failure and keep the scene unfilled.
