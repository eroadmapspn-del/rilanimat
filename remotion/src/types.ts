/** The contract between the Python app and Remotion. Mirrors src/reelstudio/media/composition.py */

export type TemplateName = "hook" | "full" | "card" | "feature" | "clip";
export type MotionName = "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "pan-up";

export type Word = { w: string; start: number; end: number }; // seconds, relative to the scene start

export type Scene = {
  id: number;
  template: TemplateName;
  seconds: number;
  /** product photo, relative to the project folder (e.g. "images/bag.jpg") */
  image: string | null;
  /** uploaded video clip, relative to the project folder (template "clip") */
  clip: string | null;
  /** real length of the uploaded clip in seconds, so it can be slowed to fit the scene */
  clipSeconds?: number | null;
  headline: string;
  bullets: string[];
  sticker: string;
  motion: MotionName;
  words: Word[];
};

export type Theme = {
  primary: string;
  secondary: string;
  ink: string;
  accent: string;
};

export type EndCard = { brand: string; tagline: string; cta: string; seconds: number };

export type ReelProps = {
  fps: number;
  width: number;
  height: number;
  /** voice-over file relative to the project folder, or null */
  voice: string | null;
  theme: Theme;
  scenes: Scene[];
  endCard: EndCard;
};
