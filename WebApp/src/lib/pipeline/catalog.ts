/** Everything the Remotion art library can draw. Gemini may only choose from these lists, so a script can never
 *  ask for a location or prop the renderer does not have. Keep in sync with remotion/src/art/*.tsx. */
export const LOCATIONS = [
  "clock-tower", "archive", "school", "tunnel", "clock-shop", "pump-station", "reservoir", "hospital", "radio-station",
  "platform", "siren-tower", "resort", "godown", "generic", "road", "office", "home", "dawn",
] as const;

export const PROPS = [
  "clock", "clock-ringing", "envelope", "recorder", "child-shadow", "files", "register", "photo", "map", "tape", "waveform",
  "lantern", "idcards", "gear", "siren", "window-shadows", "water", "headline", "diary", "screen", "phone", "calendar",
  "alarm", "tiffin", "letter", "countdown",
] as const;

export const MOODS = ["calm", "worried", "shock", "sad", "stern", "tired", "happy", "resolute"] as const;
export const ACTIONS = ["idle", "walk", "slump", "lookup", "nod"] as const;
export const CAMERAS = ["push-in", "pull-out", "pan-left", "pan-right", "tilt-up", "tilt-down", "drift", "static"] as const;
export const TRANSITIONS = ["fade", "slide-up", "slide-left", "zoom", "cut"] as const;
export const VIEWS = ["wide", "close"] as const;

export type Language = "Hindi" | "Hinglish" | "English";

/** Spoken words per second, measured on Gemini TTS storyteller narration (Hindi: 130 words took 68 s). Used to fit a script to its length. */
export const WORDS_PER_SECOND: Record<Language, number> = { Hindi: 1.9, Hinglish: 2.0, English: 2.3 };

export const SCENE_WORDS = { min: 9, max: 18 }; // one shot is about 4-8 seconds of narration
