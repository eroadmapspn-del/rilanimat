import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import type { Theme } from "../types";

/** Soft gradient in the brand colours, optionally with a blurred copy of the photo behind it. */
export const Backdrop: React.FC<{ theme: Theme; image?: string | null; blur?: number }> = ({
  theme,
  image,
  blur = 40,
}) => (
  <AbsoluteFill style={{ background: `linear-gradient(160deg, ${theme.primary}, ${theme.secondary})` }}>
    {image ? (
      <Img
        src={staticFile(image)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: `blur(${blur}px) brightness(0.8) saturate(1.2)`,
          transform: "scale(1.2)",
          opacity: 0.75,
        }}
      />
    ) : null}
  </AbsoluteFill>
);
