/**
 * Props of the "Story" composition. Built by `python -m reelstudio.production build` from story.json.
 * All times are in seconds on the single reel timeline (not relative to a scene).
 */
import type { ArtSpec } from "../art/types";

export type CameraMove = "push-in" | "pull-out" | "pan-left" | "pan-right" | "tilt-up" | "tilt-down" | "drift" | "static";
export type TransitionName = "fade" | "slide-up" | "slide-left" | "zoom" | "cut";

export type TimedWord = { w: string; start: number; end: number };

export type StoryScene = {
  id: number;
  start: number;
  end: number;
  /** file relative to the public dir, or null when no asset was supplied yet */
  media: string | null;
  mediaKind: "image" | "video" | "art" | "none";
  /** an illustrated scene built from the React art library (mediaKind "art") */
  art?: ArtSpec | null;
  camera: CameraMove;
  /** transition INTO this scene, played over `transitionSeconds` before `start` */
  transition: TransitionName;
  /** 0..1 darkening / grading strength for mood */
  mood: { tint: string; dim: number };
};

export type Music = { file: string; volume: number; duckTo: number } | null;
export type Sfx = { file: string; at: number; volume: number };

export type StoryTheme = { accent: string; text: string; bg: string; fontFamily: string };

export type StoryProps = {
  fps: number;
  width: number;
  height: number;
  durationSeconds: number;
  transitionSeconds: number;
  voice: string | null;
  words: TimedWord[];
  scenes: StoryScene[];
  music: Music;
  sfx: Sfx[];
  theme: StoryTheme;
  /** keep captions and key content inside these margins (px) so Instagram's UI does not cover them */
  safe: { top: number; bottom: number; side: number };
  showCaptions: boolean;
};
