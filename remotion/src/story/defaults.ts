import type { StoryProps } from "./types";

/** What Remotion Studio shows before a real story is loaded (`--props=path/to/story.props.json`). */
export const storyDefaults: StoryProps = {
  fps: 30,
  width: 1080,
  height: 1920,
  durationSeconds: 6,
  transitionSeconds: 0.5,
  voice: null,
  words: [
    { w: "Load", start: 0.4, end: 0.9 },
    { w: "a", start: 0.9, end: 1.1 },
    { w: "story.", start: 1.1, end: 1.8 },
  ],
  scenes: [
    { id: 1, start: 0, end: 6, media: null, mediaKind: "none", camera: "push-in", transition: "fade", mood: { tint: "#10243a", dim: 0.35 } },
  ],
  music: null,
  sfx: [],
  theme: { accent: "#ffd166", text: "#ffffff", bg: "#16324f", fontFamily: '"Segoe UI", "Nirmala UI", "Noto Sans Devanagari", "Helvetica Neue", Arial, sans-serif' },
  safe: { top: 250, bottom: 420, side: 90 },
  showCaptions: true,
};
