import React from "react";
import { AbsoluteFill, Easing, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Art } from "../art/Art";
import { cameraTransform } from "./camera";
import type { StoryScene, StoryTheme } from "./types";

/**
 * One scene. It lives inside a <Sequence> that starts `transitionFrames` before the scene's narrated start,
 * so the transition plays while the previous scene is still underneath.
 */
export const CinematicScene: React.FC<{
  scene: StoryScene;
  theme: StoryTheme;
  transitionFrames: number;
  isFirst: boolean;
}> = ({ scene, theme, transitionFrames, isFirst }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / Math.max(1, durationInFrames - 1);

  // transition in (the first scene simply fades up from black)
  const tf = isFirst ? 12 : Math.max(1, transitionFrames);
  const p = interpolate(frame, [0, tf], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const kind = isFirst ? "fade" : scene.transition;
  const wrap: React.CSSProperties = {};
  if (kind === "fade") wrap.opacity = p;
  if (kind === "slide-up") wrap.transform = `translateY(${(1 - p) * 100}%)`;
  if (kind === "slide-left") wrap.transform = `translateX(${(1 - p) * 100}%)`;
  if (kind === "zoom") {
    wrap.opacity = p;
    wrap.transform = `scale(${1.12 - 0.12 * p})`;
  }

  return (
    <AbsoluteFill style={{ background: "#000", ...wrap }}>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <AbsoluteFill style={{ transform: cameraTransform(scene.camera, t) }}>
          <Media scene={scene} theme={theme} />
        </AbsoluteFill>
      </AbsoluteFill>
      <Grade scene={scene} />
    </AbsoluteFill>
  );
};

const Media: React.FC<{ scene: StoryScene; theme: StoryTheme }> = ({ scene, theme }) => {
  if (scene.art) return <Art spec={scene.art} />;
  if (scene.media && scene.mediaKind === "video") {
    return <OffthreadVideo src={staticFile(scene.media)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  }
  if (scene.media) {
    return <Img src={staticFile(scene.media)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  }
  // No asset supplied yet: a plain dark gradient. The quality reviewer flags these scenes.
  return <AbsoluteFill style={{ background: `linear-gradient(160deg, ${theme.bg}, #000)` }} />;
};

/** Colour mood, vignette and a soft shade at the bottom so captions stay readable. */
const Grade: React.FC<{ scene: StoryScene }> = ({ scene }) => (
  <>
    <AbsoluteFill style={{ background: scene.mood.tint, opacity: scene.mood.dim, mixBlendMode: "multiply" }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 38%)" }} />
  </>
);
