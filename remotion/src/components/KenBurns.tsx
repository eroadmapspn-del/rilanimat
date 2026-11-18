import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { MotionName } from "../types";

/** A photo with slow camera motion (zoom / pan) over the length of the scene. */
export const KenBurns: React.FC<{
  src: string;
  motion: MotionName;
  fit?: "cover" | "contain";
  style?: React.CSSProperties;
}> = ({ src, motion, fit = "cover", style }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp" });

  let scale = 1.04 + 0.14 * t;
  let x = 0;
  let y = 0;
  switch (motion) {
    case "zoom-out":
      scale = 1.18 - 0.14 * t;
      break;
    case "pan-left":
      scale = 1.15;
      x = 40 - 80 * t;
      break;
    case "pan-right":
      scale = 1.15;
      x = -40 + 80 * t;
      break;
    case "pan-up":
      scale = 1.15;
      y = 40 - 80 * t;
      break;
    default:
      break;
  }
  return (
    <Img
      src={staticFile(src)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: fit,
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
        ...style,
      }}
    />
  );
};
