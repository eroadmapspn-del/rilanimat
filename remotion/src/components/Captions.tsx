import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Word } from "../types";
import { FONT } from "../theme";

const CHUNK = 4;

/** Karaoke-style captions: a few words at a time, the spoken word is highlighted. */
export const Captions: React.FC<{ words: Word[]; accent: string; bottom?: number }> = ({
  words,
  accent,
  bottom = 230,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const now = frame / fps;
  if (!words.length) return null;

  let active = words.findIndex((w) => now >= w.start && now < w.end);
  if (active < 0) active = now < words[0].start ? 0 : words.length - 1;
  const chunkStart = Math.floor(active / CHUNK) * CHUNK;
  const chunk = words.slice(chunkStart, chunkStart + CHUNK);

  return (
    <div style={{ position: "absolute", left: 60, right: 60, bottom, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          background: "rgba(0,0,0,0.55)",
          borderRadius: 40,
          padding: "22px 40px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0 22px",
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 74,
          lineHeight: 1.2,
        }}
      >
        {chunk.map((w, i) => {
          const on = chunkStart + i === active;
          return (
            <span key={chunkStart + i} style={{ color: on ? accent : "#fff", transform: on ? "scale(1.08)" : "none" }}>
              {w.w}
            </span>
          );
        })}
      </div>
    </div>
  );
};
