import React from "react";
import { Composition } from "remotion";
import { Reel, framesFor } from "./Reel";
import type { ReelProps } from "./types";
import sample from "../sample/composition.json";
import { storyDefaults } from "./story/defaults";
import { StoryReel } from "./story/StoryReel";
import { ArtStill } from "./art/ArtStill";

const defaults = sample as unknown as ReelProps;

export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id="Reel"
    component={Reel}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={900}
    defaultProps={defaults}
    calculateMetadata={({ props }) => {
      const frames =
        props.scenes.reduce((sum, s) => sum + framesFor(s.seconds, props.fps), 0) +
        framesFor(props.endCard.seconds, props.fps);
      return { durationInFrames: frames, fps: props.fps, width: props.width, height: props.height };
    }}
  />
  <Composition
    id="Story"
    component={StoryReel}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={180}
    defaultProps={storyDefaults}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(1, Math.round(props.durationSeconds * props.fps)),
      fps: props.fps,
      width: props.width,
      height: props.height,
    })}
  />
  <Composition
    id="ArtStill"
    component={ArtStill}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={90}
    defaultProps={{ spec: { location: "clock-tower", props: [{ id: "clock-ringing" }] } }}
  />
  </>
);
