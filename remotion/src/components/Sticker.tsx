import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

/** An emoji that bounces in and gently floats. */
export const Sticker: React.FC<{ emoji: string; size?: number; style?: React.CSSProperties }> = ({
  emoji,
  size = 190,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!emoji) return null;
  const p = spring({ frame: frame - 10, fps, config: { damping: 8, stiffness: 120 } });
  const float = Math.sin(frame / 12) * 14;
  return (
    <div
      style={{
        position: "absolute",
        fontSize: size,
        transform: `translateY(${float}px) scale(${p}) rotate(${(1 - p) * -25 + Math.sin(frame / 18) * 4}deg)`,
        filter: "drop-shadow(0 12px 18px rgba(0,0,0,0.3))",
        ...style,
      }}
    >
      {emoji}
    </div>
  );
};
