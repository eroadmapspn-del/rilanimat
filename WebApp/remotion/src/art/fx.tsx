import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, rand } from "./palette";

/** Slow drifting fog banks. */
export const Fog: React.FC<{ opacity?: number; y?: number }> = ({ opacity = 0.35, y = 1100 }) => {
  const f = useCurrentFrame();
  return (
    <g opacity={opacity} style={{ mixBlendMode: "screen" }}>
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={200 + i * 380 + Math.sin(f / 90 + i * 2) * 90} cy={y + i * 150} rx={520} ry={90 + i * 25} fill={C.tealLight} opacity={0.25} filter="url(#blur40)" />
      ))}
    </g>
  );
};

/** Dust motes catching light. */
export const Dust: React.FC<{ count?: number; color?: string }> = ({ count = 40, color = C.glow }) => {
  const f = useCurrentFrame();
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const x = (rand(i + 1) * 1080 + Math.sin(f / 70 + i) * 30 + f * (0.15 + rand(i + 9) * 0.3)) % 1080;
        const y = (rand(i + 50) * 1920 - f * (0.2 + rand(i + 3) * 0.5) + 1920 * 4) % 1920;
        return <circle key={i} cx={x} cy={y} r={1.5 + rand(i + 7) * 3} fill={color} opacity={0.12 + rand(i + 11) * 0.3} />;
      })}
    </g>
  );
};

export const Rain: React.FC<{ count?: number }> = ({ count = 90 }) => {
  const f = useCurrentFrame();
  return (
    <g stroke={C.mist} strokeWidth={2} opacity={0.35}>
      {Array.from({ length: count }, (_, i) => {
        const x = rand(i + 3) * 1200 - 60;
        const y = (rand(i + 21) * 2200 + f * (38 + rand(i) * 20)) % 2200 - 150;
        return <line key={i} x1={x} y1={y} x2={x - 14} y2={y + 60} />;
      })}
    </g>
  );
};

/** A cone of warm light from (x, y) spreading downward. */
export const Beam: React.FC<{ x: number; y: number; spread?: number; length?: number; opacity?: number }> = ({
  x, y, spread = 260, length = 900, opacity = 0.35,
}) => (
  <polygon points={`${x - 18},${y} ${x + 18},${y} ${x + spread},${y + length} ${x - spread},${y + length}`} fill="url(#beamGrad)" opacity={opacity} style={{ mixBlendMode: "screen" }} />
);

/** Shared gradients and filters. Render once inside every <svg>. */
export const Defs: React.FC = () => (
  <defs>
    <filter id="blur40" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40" /></filter>
    <filter id="blur12" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12" /></filter>
    <linearGradient id="beamGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={C.glow} stopOpacity="0.9" />
      <stop offset="1" stopColor={C.amber} stopOpacity="0" />
    </linearGradient>
    <radialGradient id="glowGrad">
      <stop offset="0" stopColor={C.glow} stopOpacity="1" />
      <stop offset="0.35" stopColor={C.amber} stopOpacity="0.55" />
      <stop offset="1" stopColor={C.amber} stopOpacity="0" />
    </radialGradient>
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={C.ink} />
      <stop offset="0.6" stopColor={C.night} />
      <stop offset="1" stopColor={C.teal} />
    </linearGradient>
  </defs>
);

/** A soft amber glow around a light source. */
export const Glow: React.FC<{ x: number; y: number; r?: number; flicker?: boolean }> = ({ x, y, r = 300, flicker = true }) => {
  const f = useCurrentFrame();
  const k = flicker ? 0.9 + Math.sin(f / 5) * 0.05 + Math.sin(f / 13) * 0.05 : 1;
  return <circle cx={x} cy={y} r={r * k} fill="url(#glowGrad)" style={{ mixBlendMode: "screen" }} />;
};

export const useSeconds = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return f / fps;
};
