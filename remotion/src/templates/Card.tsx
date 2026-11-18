import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene, Theme } from "../types";
import { Backdrop } from "../components/Backdrop";
import { Headline } from "../components/Headline";
import { KenBurns } from "../components/KenBurns";
import { Sticker } from "../components/Sticker";

/** Photo in a rounded card on a blurred copy of itself, headline above. */
export const Card: React.FC<{ scene: Scene; theme: Theme }> = ({ scene, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 110 } });
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} image={scene.image} />
      <AbsoluteFill style={{ padding: "130px 70px 0" }}>
        <Headline text={scene.headline} size={104} />
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          top: 560,
          height: 900,
          borderRadius: 64,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 30px 80px rgba(0,0,0,0.4)",
          transform: `scale(${0.85 + 0.15 * p}) translateY(${(1 - p) * 120}px)`,
          opacity: p,
        }}
      >
        {scene.image ? (
          <KenBurns src={scene.image} motion={scene.motion} fit="contain" style={{ background: "#fff" }} />
        ) : null}
      </div>
      <Sticker emoji={scene.sticker} size={190} style={{ left: 60, top: 1330 }} />
    </AbsoluteFill>
  );
};
