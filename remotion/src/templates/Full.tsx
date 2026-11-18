import React from "react";
import { AbsoluteFill } from "remotion";
import type { Scene, Theme } from "../types";
import { Backdrop } from "../components/Backdrop";
import { Headline } from "../components/Headline";
import { KenBurns } from "../components/KenBurns";
import { Sticker } from "../components/Sticker";

/** The product photo fills the screen with slow camera motion. Used for the reveal and the payoff. */
export const Full: React.FC<{ scene: Scene; theme: Theme }> = ({ scene, theme }) => (
  <AbsoluteFill>
    <Backdrop theme={theme} image={scene.image} />
    {scene.image ? <KenBurns src={scene.image} motion={scene.motion} /> : null}
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55) 100%)",
      }}
    />
    <AbsoluteFill style={{ padding: "150px 70px 0" }}>
      <Headline text={scene.headline} size={118} />
    </AbsoluteFill>
    <Sticker emoji={scene.sticker} size={200} style={{ right: 70, top: 700 }} />
  </AbsoluteFill>
);
