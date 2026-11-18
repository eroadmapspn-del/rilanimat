import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "../theme";

/** Big headline whose words pop in one after another. */
export const Headline: React.FC<{
  text: string;
  size?: number;
  color?: string;
  align?: "center" | "left";
  style?: React.CSSProperties;
}> = ({ text, size = 120, color = "#fff", align = "center", style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        gap: `0 ${size * 0.22}px`,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.05,
        color,
        textAlign: align,
        textShadow: "0 8px 30px rgba(0,0,0,0.35)",
        ...style,
      }}
    >
      {words.map((w, i) => {
        const p = spring({ frame: frame - 4 - i * 4, fps, config: { damping: 12, stiffness: 160 } });
        return (
          <span
            key={i}
            style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 60}px) scale(${0.7 + 0.3 * p})` }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};
