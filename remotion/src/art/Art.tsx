import React from "react";
import { AbsoluteFill } from "remotion";
import { Character } from "./characters";
import { Defs, Dust, Fog, Glow, Rain } from "./fx";
import { LOCATIONS } from "./locations";
import { PROPS } from "./props";
import { C } from "./palette";
import type { ArtSpec } from "./types";

const CHAR_LAYOUT: Record<number, Array<{ x: number; scale: number }>> = {
  1: [{ x: 540, scale: 1.45 }],
  2: [{ x: 320, scale: 1.05 }, { x: 760, scale: 1.05 }],
  3: [{ x: 210, scale: 0.85 }, { x: 540, scale: 0.9 }, { x: 870, scale: 0.85 }],
};

/** Props that hang on or stand against the wall. Everything else sits on a table. */
const WALL = new Set(["child-shadow", "window-shadows", "siren", "clock", "clock-ringing", "gear", "water"]);
const TABLE_TOP = 1200;

const Table: React.FC<{ glowX: number }> = ({ glowX }) => (
  <g>
    <defs>
      <linearGradient id="woodGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5a3d26" />
        <stop offset="0.08" stopColor="#3a2718" />
        <stop offset="1" stopColor="#140d08" />
      </linearGradient>
    </defs>
    <rect y={TABLE_TOP} width={1080} height={1920 - TABLE_TOP} fill="url(#woodGrad)" />
    <rect y={TABLE_TOP} width={1080} height={6} fill={C.amber} opacity={0.55} />
    {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M0 ${TABLE_TOP + 90 + i * 130} Q540 ${TABLE_TOP + 70 + i * 130} 1080 ${TABLE_TOP + 100 + i * 130}`} stroke="#000" strokeWidth={3} opacity={0.25} fill="none" />)}
    <ellipse cx={glowX} cy={TABLE_TOP + 40} rx={460} ry={90} fill="url(#glowGrad)" opacity={0.5} style={{ mixBlendMode: "screen" }} />
  </g>
);

/** Composes a location, props and characters into one 1080x1920 illustrated frame. */
export const Art: React.FC<{ spec: ArtSpec }> = ({ spec }) => {
  const Location = LOCATIONS[spec.location] ?? LOCATIONS.generic;
  const chars = (spec.characters ?? []).slice(0, 3);
  const layout = CHAR_LAYOUT[Math.max(1, chars.length)];
  const props = (spec.props ?? []).filter((p) => PROPS[p.id]);
  const photo = spec.look === "photo";
  const wall = props.filter((p) => WALL.has(p.id));
  const desk = props.filter((p) => !WALL.has(p.id));
  const useTable = desk.length > 0 && chars.length === 0;

  const place = (p: (typeof props)[number], x: number, y: number, s: number, key: number) => {
    const Prop = PROPS[p.id];
    return (
      <g key={key} transform={`translate(${p.x ?? x} ${p.y ?? y}) rotate(${p.rotate ?? 0}) scale(${p.scale ?? s})`}>
        <Prop />
      </g>
    );
  };

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <svg viewBox="0 0 1080 1920" width="100%" height="100%" style={{ filter: photo ? "sepia(0.9) contrast(1.1) brightness(0.9)" : undefined }}>
        <Defs />
        <Location />

        {/* wall props: the hero is centred and large, a second one sits to the side */}
        {wall.map((p, i) => {
          const hero = i === 0 && desk.length === 0;
          const x = hero ? 540 : 790;
          const towerClock = spec.location === "clock-tower" && p.id.startsWith("clock");
          const y = towerClock ? 640 : hero ? (chars.length ? 600 : 800) : useTable ? 620 : 760;
          const s = p.id === "child-shadow" ? (hero ? 2.2 : 1.7) : towerClock ? 1.1 : hero ? (chars.length ? 1.0 : 1.5) : 1.0;
          return place(p, x, y, s, i);
        })}

        {useTable && <Table glowX={desk.length > 1 ? 440 : 540} />}

        {desk.map((p, i) => {
          if (useTable) {
            const two = desk.length > 1;
            const pos = i === 0 ? { x: two ? 430 : 540, y: two ? 960 : 930, s: two ? 1.3 : 1.5 } : { x: 780 + i * 20, y: 1060, s: 0.85 };
            return (
              <g key={"d" + i}>
                <ellipse cx={p.x ?? pos.x} cy={TABLE_TOP + 14} rx={190 * pos.s} ry={22} fill="#000" opacity={0.45} />
                {place({ ...p, rotate: p.rotate ?? (i ? 8 : 0) }, pos.x, pos.y, pos.s, i)}
              </g>
            );
          }
          // with people in the shot the object floats above them as the thing they are looking at
          return place(p, 540, 560 + i * 20, 0.95, i);
        })}

        {chars.map((c, i) => (
          <Character key={c.id + i} id={c.id} x={c.x ?? layout[i].x} y={c.y ?? 1880} scale={c.scale ?? layout[i].scale} flip={c.flip ?? i === 1} shadow={c.shadow} face={c.face} />
        ))}

        {useTable && <Glow x={540} y={420} r={600} flicker={false} />}
        <Fog opacity={spec.fog ?? 0.35} />
        {spec.rain && <Rain />}
        {(spec.dust ?? true) && <Dust />}
      </svg>
    </AbsoluteFill>
  );
};
