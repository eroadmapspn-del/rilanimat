import type { StoryProps } from "../../../remotion/src/story/types";
import type { ArtSpec } from "../../../remotion/src/art/types";
import type { EpisodeStory } from "./scriptwriter";
import type { Look } from "@/lib/look";
import type { VoiceResult } from "./voice";

export const FPS = 30;
export const TAIL_SECONDS = 0.9; // a short breath after the last word before the video ends
export const TRANSITION_SECONDS = 0.5;
export const SAFE = { top: 250, bottom: 420, side: 90 }; // px: keeps captions clear of Instagram's buttons and caption bar
const THEME = {
  accent: "#ffd166", text: "#ffffff", bg: "#16324f",
  fontFamily: '"Noto Sans Devanagari", "Nirmala UI", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
};

const DARK_TONE = /dark|tense|mystery|suspense|thriller|horror|eerie|gloomy|रहस्य|डर|भूतिया|सस्पेंस|मिस्ट्री/i;

/** Scenes consume the voice's words in order, by word count. They must add up exactly, or captions would drift. */
export function assignWords(story: EpisodeStory, wordCount: number): [number, number][] {
  const spans: [number, number][] = [];
  let i = 0;
  for (const s of story.scenes) {
    const n = s.text.split(/\s+/).filter(Boolean).length;
    spans.push([i, Math.min(i + n, wordCount)]);
    i += n;
  }
  if (i !== wordCount) throw new Error(`The script has ${i} words but the voice-over has ${wordCount}. Record the voice-over again.`);
  return spans;
}

export function buildProps(opts: {
  story: EpisodeStory;
  voice: Pick<VoiceResult, "words" | "duration">;
  voiceFile: string;
  looks: Map<string, Look>;
  tone: string;
}): StoryProps {
  const { story, voice, looks } = opts;
  const words = voice.words;
  const spans = assignWords(story, words.length);
  const friendly = !DARK_TONE.test(opts.tone);

  const scenes = story.scenes.map((scene, i) => {
    const a = spans[i][0];
    const nextStart = i + 1 < spans.length ? spans[i + 1][0] : null;
    const start = i === 0 ? 0 : words[a].start;
    const end = nextStart !== null && nextStart < words.length ? words[nextStart].start : voice.duration + TAIL_SECONDS;
    const src = scene.visual.art;
    const art: ArtSpec = {
      location: src.location,
      props: src.props,
      characters: src.characters.map((c) => ({ id: c.id, look: looks.get(c.id), mood: c.mood as never, action: c.action as never })),
      fog: friendly ? Math.min(0.15, src.fog ?? 0.15) : src.fog,
      rain: src.rain,
      dust: src.dust,
      view: (src.view as "wide" | "close" | undefined) ?? "wide",
      look: friendly ? "friendly" : "normal",
    };
    return {
      id: i + 1,
      start: Math.round(start * 1000) / 1000,
      end: Math.round(Math.max(end, start + 0.5) * 1000) / 1000,
      media: null,
      mediaKind: "art" as const,
      art,
      camera: scene.visual.camera as StoryProps["scenes"][number]["camera"],
      transition: scene.transition as StoryProps["scenes"][number]["transition"],
      mood: friendly ? { tint: "#6a8a8c", dim: 0.12 } : scene.visual.atmosphere,
    };
  });

  return {
    fps: FPS, width: 1080, height: 1920,
    durationSeconds: Math.round((voice.duration + TAIL_SECONDS) * 1000) / 1000,
    transitionSeconds: TRANSITION_SECONDS,
    voice: opts.voiceFile,
    words,
    scenes,
    music: null,
    sfx: [],
    theme: THEME,
    safe: SAFE,
    showCaptions: true,
  };
}
