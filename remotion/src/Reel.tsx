import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { ReelProps, Scene } from "./types";
import { Captions } from "./components/Captions";
import { Card } from "./templates/Card";
import { ClipScene } from "./templates/ClipScene";
import { EndCard } from "./templates/EndCard";
import { Feature } from "./templates/Feature";
import { Full } from "./templates/Full";
import { Hook } from "./templates/Hook";

export const framesFor = (seconds: number, fps: number) => Math.max(1, Math.round(seconds * fps));

const Body: React.FC<{ scene: Scene; theme: ReelProps["theme"] }> = ({ scene, theme }) => {
  switch (scene.template) {
    case "hook":
      return <Hook scene={scene} theme={theme} />;
    case "full":
      return <Full scene={scene} theme={theme} />;
    case "feature":
      return <Feature scene={scene} theme={theme} />;
    case "clip":
      return <ClipScene scene={scene} theme={theme} />;
    default:
      return <Card scene={scene} theme={theme} />;
  }
};

/** One scene: a quick fade in, the template, then karaoke captions on top. */
const SceneView: React.FC<{ scene: Scene; theme: ReelProps["theme"] }> = ({ scene, theme }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, 6], [0.2, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 5, durationInFrames], [1, 0.4], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>
      <Body scene={scene} theme={theme} />
      <Captions words={scene.words} accent={theme.accent} />
    </AbsoluteFill>
  );
};

export const Reel: React.FC<ReelProps> = ({ fps, voice, theme, scenes, endCard }) => {
  let from = 0;
  const parts = scenes.map((scene) => {
    const dur = framesFor(scene.seconds, fps);
    const start = from;
    from += dur;
    return (
      <Sequence key={scene.id} from={start} durationInFrames={dur}>
        <SceneView scene={scene} theme={theme} />
      </Sequence>
    );
  });
  return (
    <AbsoluteFill style={{ background: theme.primary }}>
      {parts}
      <Sequence from={from} durationInFrames={framesFor(endCard.seconds, fps)}>
        <EndCard card={endCard} theme={theme} />
      </Sequence>
      {voice ? <Audio src={staticFile(voice)} /> : null}
    </AbsoluteFill>
  );
};
