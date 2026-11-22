import React from "react";
import { Composition } from "remotion";
import { storyDefaults } from "./story/defaults";
import { StoryReel } from "./story/StoryReel";

/** The only composition the web app renders. Props are built by src/lib/pipeline/timeline.ts. */
export const RemotionRoot: React.FC = () => (
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
);
