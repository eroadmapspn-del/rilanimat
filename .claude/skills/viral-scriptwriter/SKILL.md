---
name: viral-scriptwriter
description: Write the narration for a 30-60 second storytelling reel. Produces three distinct opening hooks, then a full script with curiosity, conflict and a satisfying ending, timed to length. Use after research is confirmed and before voiceover.
---

# viral-scriptwriter

Stage 2-3: **three hooks -> approved script**. Input: `research.md` (or the user's topic for fiction).

## Do
1. Write **three hooks**, each a different type (see `references/hooks-and-cliches.md`): e.g. a contradiction, a vivid scene, a question the story answers. Max 12 words each, speakable, concrete.
2. **Stop. Show the three hooks and let the user choose** (or merge). Do not continue without a choice.
3. Write the script around the chosen hook, in scene-sized beats of 1-2 sentences:
   hook -> situation -> complication -> escalation -> turn -> payoff -> quiet last line.
4. Style: spoken English (or the requested language), short sentences, concrete nouns, one idea per sentence. Read it aloud in your head. Cut anything the listener would not say.
5. Remove filler, repetition and the phrases in the cliche list. End on the story's own last beat. No "follow for more", no question to the comments.
6. **Fit the time.** Count words. Target 2.2-2.8 words per second: 30 s = 70-85 words, 45 s = 100-125, 60 s = 135-165. Revise until inside the range; report the estimate (`words / 2.4`).
7. **Voice-safe text**: write numbers and symbols as words ("nineteen eighty one", "percent"). Use commas and full stops where you want pauses; the pipeline places captions from them.
8. Save `script.md` with: chosen hook, word count, estimated seconds, scene beats, and a "facts used" line that matches `research.md`.

## Stop
Present the script with the word count and estimated length. **Wait for explicit approval** before voiceover or any paid generation.
