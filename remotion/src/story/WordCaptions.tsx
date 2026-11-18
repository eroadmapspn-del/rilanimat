import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { StoryTheme, TimedWord } from "./types";

export type Group = { words: TimedWord[]; start: number; end: number };

/** Split the word stream into short on-screen phrases: at punctuation, after 4 words, or after a pause. */
export function groupWords(words: TimedWord[], maxWords = 4, maxGap = 0.45): Group[] {
  const groups: Group[] = [];
  let cur: TimedWord[] = [];
  const flush = () => {
    if (cur.length) groups.push({ words: cur, start: cur[0].start, end: cur[cur.length - 1].end });
    cur = [];
  };
  words.forEach((w, i) => {
    const prev = cur[cur.length - 1];
    if (prev && w.start - prev.end > maxGap) flush();
    cur.push(w);
    if (i === words.length - 1 || cur.length >= maxWords || /[.!?,;:]$/.test(w.w)) flush();
  });
  return groups;
}

/** Word-level captions: the phrase on screen follows the voice, and the spoken word pops in the accent colour. */
export const WordCaptions: React.FC<{ groups: Group[]; theme: StoryTheme; bottom: number; side: number }> = ({
  groups,
  theme,
  bottom,
  side,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const now = frame / fps;

  const index = groups.findIndex((g, i) => now >= g.start - 0.04 && now < (groups[i + 1]?.start ?? g.end + 0.4));
  if (index < 0) return null;
  const group = groups[index];
  const enter = spring({ frame: frame - Math.round(group.start * fps), fps, config: { damping: 16, stiffness: 180 } });

  return (
    <div style={{ position: "absolute", left: side, right: side, bottom, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "6px 34px",
          fontFamily: theme.fontFamily,
          fontWeight: 900,
          fontSize: 84,
          lineHeight: 1.12,
          textTransform: "uppercase",
          textAlign: "center",
          transform: `translateY(${(1 - enter) * 24}px)`,
          opacity: interpolate(enter, [0, 1], [0, 1]),
        }}
      >
        {group.words.map((w, i) => {
          const active = now >= w.start && now < w.end;
          const pop = active
            ? 1 + 0.06 * spring({ frame: frame - Math.round(w.start * fps), fps, config: { damping: 9, stiffness: 260 } })
            : 1;
          return (
            <span
              key={i}
              style={{
                color: active ? theme.accent : theme.text,
                // letter-spacing breaks Devanagari conjuncts, so only add it to Latin words
                letterSpacing: /[ऀ-ॿ]/.test(w.w) ? 0 : 1,
                transform: `scale(${pop})`,
                textShadow: "0 4px 18px rgba(0,0,0,0.85), 0 0 3px rgba(0,0,0,0.9)",
                WebkitTextStroke: "2px rgba(0,0,0,0.55)",
                paintOrder: "stroke fill",
              }}
            >
              {w.w.replace(/[.,;:]+$/, "")}
            </span>
          );
        })}
      </div>
    </div>
  );
};
