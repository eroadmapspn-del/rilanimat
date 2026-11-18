import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { EndCard as EndCardProps, Theme } from "../types";
import { Backdrop } from "../components/Backdrop";
import { FONT } from "../theme";

export const EndCard: React.FC<{ card: EndCardProps; theme: Theme }> = ({ card, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = spring({ frame: frame - 2, fps, config: { damping: 10, stiffness: 120 } });
  const tag = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  const cta = spring({ frame: frame - 28, fps, config: { damping: 10, stiffness: 150 } });
  const pulse = 1 + Math.sin(frame / 6) * 0.03;
  return (
    <AbsoluteFill>
      <Backdrop theme={theme} />
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center", fontFamily: FONT, textAlign: "center", padding: 70 }}
      >
        <div
          style={{
            fontSize: 200,
            fontWeight: 900,
            color: "#fff",
            transform: `scale(${brand})`,
            textShadow: "0 10px 40px rgba(0,0,0,0.3)",
          }}
        >
          {card.brand}
        </div>
        <div
          style={{
            fontSize: 74,
            fontWeight: 700,
            color: "#fff",
            marginTop: 30,
            opacity: tag,
            transform: `translateY(${(1 - tag) * 40}px)`,
          }}
        >
          {card.tagline}
        </div>
        {card.cta ? (
          <div
            style={{
              marginTop: 110,
              background: "#fff",
              color: theme.ink,
              fontSize: 62,
              fontWeight: 900,
              padding: "28px 70px",
              borderRadius: 999,
              boxShadow: "0 18px 40px rgba(0,0,0,0.3)",
              opacity: cta,
              transform: `scale(${cta * pulse})`,
            }}
          >
            {card.cta}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
