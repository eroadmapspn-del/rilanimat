/** One palette for the whole season, so every illustrated scene shares the same dark teal + amber look. */
export const C = {
  ink: "#03090d",
  night: "#071a21",
  teal: "#0e3a45",
  tealLight: "#2a7a83",
  mist: "#7fb7b8",
  amber: "#ffb347",
  glow: "#ffd9a0",
  red: "#d6423a",
  paper: "#d9c9a3",
  paperDark: "#a89870",
  brass: "#b98a3e",
  steel: "#6c7c84",
  wood: "#4a3322",
  brick: "#5a3a30",
} as const;

/** Deterministic pseudo-random in [0,1) from a seed (frames must render identically every time). */
export const rand = (seed: number): number => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
