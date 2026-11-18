import type { CharacterId } from "./characters";

/** One illustrated shot, composed from the season's fixed library. Produced from story.json `visual.art`. */
export type ArtSpec = {
  location: string;
  characters?: Array<{ id: CharacterId; x?: number; y?: number; scale?: number; flip?: boolean; shadow?: number; face?: boolean }>;
  props?: Array<{ id: string; x?: number; y?: number; scale?: number; rotate?: number }>;
  fog?: number;
  rain?: boolean;
  dust?: boolean;
  /** "photo": render as an old sepia photograph (flashbacks, Arjun's 2008 pictures) */
  look?: "normal" | "photo";
};
