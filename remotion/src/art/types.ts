import type { CharacterId, Mood } from "./characters";

/** One illustrated shot, composed from the season's fixed library. Produced from story.json `visual.art`. */
export type ArtSpec = {
  location: string;
  characters?: Array<{ id: CharacterId; x?: number; y?: number; scale?: number; flip?: boolean; shadow?: number; face?: boolean; mood?: Mood }>;
  props?: Array<{ id: string; x?: number; y?: number; scale?: number; rotate?: number }>;
  fog?: number;
  rain?: boolean;
  dust?: boolean;
  /** "photo": render as an old sepia photograph (flashbacks, Arjun's 2008 pictures) */
  look?: "normal" | "photo";
  /** "close": punch in on the first character (or the objects) for a closer, more intimate shot */
  view?: "wide" | "close";
};
