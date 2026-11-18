---
name: story-researcher
description: Find the strongest angle for a faceless storytelling reel and write a research brief that separates verified facts from fiction. Use at the start of a production, when the user gives a topic, before any scriptwriting.
---

# story-researcher

Stage 1 of the workflow: **Topic -> Research** -> hooks -> approved script -> voiceover -> storyboard -> assets -> render -> review.

## Do
1. Work in `productions/<slug>/` (create it with `python -m reelstudio.production new productions/<slug>` if missing). Pick a short slug.
2. Decide the mode and say it to the user in one line:
   - **true story**: real events, people, dates. Research is required.
   - **fiction**: invented. No research needed. Mark it `fiction` everywhere.
   - **inspired by**: a real kernel with invented detail. Separate the two explicitly.
3. Find the angle: the single human question the reel answers (who wanted what, what stood in the way, what changed). Test three angles, keep the one with the sharpest conflict and a payoff that fits 30-60 seconds. Drop the rest in one line each.
4. For true or inspired stories, use WebSearch/WebFetch only when available. Prefer primary or reputable sources. Record the URL beside every factual claim. If no source can be reached, say so and mark the claim **unverified**. Never fill gaps from memory and call it verified.
5. Write `research.md` using `references/brief-template.md`. Keep it to one screen.

## Rules
- Facts table: claim, status (`verified` / `unverified` / `disputed` / `invented`), source.
- Anything invented for drama (dialogue, thoughts, exact times) is listed under "Dramatised" so the script can avoid presenting it as fact.
- Do not write the narration here. That is `viral-scriptwriter`.

## Stop
Show the angle and the facts table. Ask the user to confirm the angle before scripting.
