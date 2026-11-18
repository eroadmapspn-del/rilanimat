import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { Scene, Theme } from "../types";
import { Backdrop } from "../components/Backdrop";
import { Headline } from "../components/Headline";
import { KenBurns } from "../components/KenBurns";
import { Sticker } from "../components/Sticker";

/** Big text on the brand gradient. Used for the hook and the problem. */
export const Hook: React.FC<{ scene: Scene; theme: Theme }> = ({ scene, theme }) => {
  const frame = useCurrentFrame();
  const peek = interpolate(frame, [0, 24], [420, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      <Sticker emoji={scene.sticker} size={260} style={{ top: 230, right: 90 }} />
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 70px", paddingBottom: 260 }}>
        <Headline text={scene.headline} size={150} />
      </AbsoluteFill>
      {scene.image ? (
        <div
          style={{
            position: "absolute",
            left: 160,
            right: 160,
            bottom: -80,
            height: 760,
            borderRadius: "60px 60px 0 0",
            overflow: "hidden",
            transform: `translateY(${peek}px) rotate(-3deg)`,
            boxShadow: "0 -20px 60px rgba(0,0,0,0.3)",
          }}
        >
          <KenBurns src={scene.image} motion={scene.motion} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
