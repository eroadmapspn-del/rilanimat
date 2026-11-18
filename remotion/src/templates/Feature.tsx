import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene, Theme } from "../types";
import { Backdrop } from "../components/Backdrop";
import { Headline } from "../components/Headline";
import { KenBurns } from "../components/KenBurns";
import { FONT } from "../theme";

/** Photo plus feature chips that pop in one by one. */
export const Feature: React.FC<{ scene: Scene; theme: Theme }> = ({ scene, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bullets = scene.bullets.slice(0, 3);
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} image={scene.image} />
      <AbsoluteFill style={{ padding: "120px 70px 0" }}>
        <Headline text={scene.headline} size={100} />
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 220,
          right: 220,
          top: 440,
          height: 540,
          borderRadius: 56,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 30px 80px rgba(0,0,0,0.4)",
        }}
      >
        {scene.image ? (
          <KenBurns src={scene.image} motion={scene.motion} fit="contain" style={{ background: "#fff" }} />
        ) : null}
      </div>
      <div
        style={{ position: "absolute", left: 70, right: 70, top: 1020, display: "flex", flexDirection: "column", gap: 18 }}
      >
        {bullets.map((b, i) => {
          const p = spring({ frame: frame - 18 - i * 14, fps, config: { damping: 12, stiffness: 140 } });
          return (
            <div
              key={i}
              style={{
                alignSelf: i % 2 ? "flex-end" : "flex-start",
                background: "#fff",
                color: theme.ink,
                fontFamily: FONT,
                fontWeight: 800,
                fontSize: 56,
                padding: "18px 40px",
                borderRadius: 999,
                boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
                opacity: p,
                transform: `translateX(${(1 - p) * (i % 2 ? 300 : -300)}px)`,
              }}
            >
              <span style={{ color: theme.accent }}>✓ </span>
              {b}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
