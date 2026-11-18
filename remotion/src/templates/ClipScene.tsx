import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import type { Scene, Theme } from "../types";
import { Backdrop } from "../components/Backdrop";
import { Headline } from "../components/Headline";

/**
 * A video clip you uploaded, filling the screen (muted: the voice-over carries the sound).
 * A clip shorter than its scene is slowed down (at most to 70% speed); a longer one is simply cut.
 */
export const ClipScene: React.FC<{ scene: Scene; theme: Theme }> = ({ scene, theme }) => {
  const ratio = scene.clipSeconds ? scene.clipSeconds / scene.seconds : 1;
  const playbackRate = Math.min(1, Math.max(0.7, ratio));
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      {scene.clip ? (
        <OffthreadVideo
          src={staticFile(scene.clip)}
          muted
          playbackRate={playbackRate}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : null}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0) 30%)" }} />
      {scene.headline ? (
        <AbsoluteFill style={{ padding: "130px 70px 0" }}>
          <Headline text={scene.headline} size={104} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
