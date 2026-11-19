import React from "react";
import { useCurrentFrame } from "remotion";
import { C, rand } from "./palette";
import { Beam, Glow } from "./fx";

/** Everyday-life backdrops (office, home, the road between them, a new dawn) and props, for modern stories. */

const SkyGrad: React.FC<{ id: string; stops: Array<[number, string]> }> = ({ id, stops }) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      {stops.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
    </linearGradient>
  </defs>
);

/** A skyline strip that tiles every 1080 px, so a scroll of any length loops without a seam. */
const Skyline: React.FC<{ seed: number; base: number; minH: number; maxH: number; fill: string; lit?: number; offset: number }> = ({ seed, base, minH, maxH, fill, lit = 0, offset }) => {
  const n = 9, w = 1080 / n;
  const draw = (dx: number, k: string) => (
    <g key={k} transform={`translate(${dx} 0)`}>
      {Array.from({ length: n }, (_, i) => {
        const h = minH + rand(seed + i * 3) * (maxH - minH);
        return (
          <g key={i}>
            <rect x={i * w} y={base - h} width={w + 1} height={h + 400} fill={fill} />
            {lit > 0 && Array.from({ length: Math.floor(h / 70) }, (_, r) => rand(seed + i * 31 + r) < lit ? <rect key={r} x={i * w + 16 + (r % 2) * 40} y={base - h + 24 + r * 70} width={26} height={34} fill={C.amber} opacity={0.75} /> : null)}
          </g>
        );
      })}
    </g>
  );
  const o = ((offset % 1080) + 1080) % 1080;
  return <g transform={`translate(${-o} 0)`}>{draw(0, "a")}{draw(1080, "b")}</g>;
};

/** The road between home and office. Layers scroll at different speeds while the walker stays still. */
export const Road: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <g>
      <SkyGrad id="roadSky" stops={[[0, "#0a1626"], [0.5, "#1c3346"], [1, "#4a4a52"]]} />
      <rect width={1080} height={1920} fill="url(#roadSky)" />
      <Skyline seed={11} base={1250} minH={260} maxH={620} fill="#0d1d28" lit={0.25} offset={f * 1.2} />
      <Skyline seed={37} base={1420} minH={200} maxH={440} fill="#08141c" lit={0.12} offset={f * 3} />
      <rect y={1420} width={1080} height={500} fill="#101417" />
      <rect y={1420} width={1080} height={10} fill={C.amber} opacity={0.35} />
      {/* kerb and lane marks scroll fastest */}
      {Array.from({ length: 6 }, (_, i) => {
        const x = ((i * 260 - f * 9) % 1560 + 1560) % 1560 - 240;
        return <rect key={i} x={x} y={1700} width={150} height={12} fill="#3b4348" />;
      })}
      {/* street lamps */}
      {Array.from({ length: 3 }, (_, i) => {
        const x = ((i * 480 - f * 6) % 1440 + 1440) % 1440 - 180;
        return (
          <g key={i}>
            <rect x={x - 6} y={1000} width={12} height={440} fill="#05090c" />
            <circle cx={x} cy={990} r={16} fill={C.glow} />
            <Glow x={x} y={990} r={170} flicker={false} />
          </g>
        );
      })}
    </g>
  );
};

/** Open-plan office, late. Cubicles, cold monitors and a window onto the dusk. */
export const Office: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <g>
      <rect width={1080} height={1920} fill="#0c222a" />
      <rect y={0} width={1080} height={160} fill="#0a1a20" />
      {[220, 540, 860].map((x) => <rect key={x} x={x - 90} y={60} width={180} height={18} rx={8} fill="#cfe9e6" opacity={0.85} />)}
      <Beam x={540} y={70} spread={560} length={1100} opacity={0.14} />
      {/* window onto the dusk city */}
      <g transform="translate(660 230)">
        <rect width={380} height={560} fill="#1c3040" />
        <rect width={380} height={560} fill="#e8924a" opacity={0.22} />
        <Skyline seed={5} base={540} minH={120} maxH={330} fill="#0b1a23" lit={0.3} offset={0} />
        <rect width={380} height={560} fill="none" stroke="#06131a" strokeWidth={14} />
        <path d="M190 0 V560 M0 280 H380" stroke="#06131a" strokeWidth={8} />
      </g>
      {/* wall clock, hands never seem to move */}
      <g transform="translate(250 380)">
        <circle r={96} fill="#d9d2bd" /><circle r={96} fill="none" stroke="#23303a" strokeWidth={10} />
        {Array.from({ length: 12 }, (_, i) => <rect key={i} x={-3} y={-84} width={6} height={i % 3 === 0 ? 20 : 10} fill="#23303a" transform={`rotate(${i * 30})`} />)}
        <rect x={-4} y={-58} width={8} height={62} rx={3} fill="#1a1a1a" transform={`rotate(${150 + f * 0.05})`} />
        <rect x={-3} y={-80} width={6} height={86} rx={3} fill="#1a1a1a" transform={`rotate(${f * 0.6})`} />
      </g>
      {/* cubicle rows */}
      {[0, 1, 2].map((r) => (
        <g key={r} transform={`translate(0 ${1020 + r * 190}) scale(${0.7 + r * 0.18})`} opacity={1}>
          {[-1, 0, 1, 2].map((c) => (
            <g key={c} transform={`translate(${c * 330 + 100} 0)`}>
              <rect width={300} height={230} fill="#12303a" stroke="#06151b" strokeWidth={6} />
              <rect x={60} y={50} width={180} height={120} rx={6} fill="#091a20" />
              <rect x={66} y={56} width={168} height={108} rx={4} fill={rand(r * 5 + c + 2) > 0.4 ? "#7fd0cb" : "#33636b"} opacity={0.55 + Math.sin(f / 18 + c + r) * 0.05} />
            </g>
          ))}
        </g>
      ))}
      <rect y={1700} width={1080} height={220} fill="#0a1a20" />
    </g>
  );
};

/** A small flat at night: a window to the city, a sofa, and the blue flicker of a TV. */
export const Home: React.FC = () => {
  const f = useCurrentFrame();
  const flick = 0.5 + Math.sin(f / 7) * 0.08 + Math.sin(f / 19) * 0.08;
  return (
    <g>
      <rect width={1080} height={1920} fill="#2a1b17" />
      <rect y={1480} width={1080} height={440} fill="#1a100d" />
      {/* window */}
      <g transform="translate(90 260)">
        <rect width={340} height={620} fill="#0b1a2a" />
        <Skyline seed={19} base={600} minH={140} maxH={380} fill="#07111b" lit={0.35} offset={0} />
        <rect width={340} height={620} fill="none" stroke="#120b09" strokeWidth={16} />
        <path d="M170 0 V620 M0 310 H340" stroke="#120b09" strokeWidth={8} />
      </g>
      {/* frame on the wall: a photo he stopped looking at */}
      <g transform="translate(700 380)"><rect width={190} height={240} fill="#120b09" /><rect x={14} y={14} width={162} height={212} fill="#5a4a3a" /><circle cx={95} cy={90} r={30} fill="#2a2018" /><path d="M40 210 Q95 130 150 210 Z" fill="#2a2018" /></g>
      {/* tv glow */}
      <rect x={620} y={900} width={380} height={230} rx={8} fill="#06090c" />
      <rect x={632} y={912} width={356} height={206} fill="#5aa9d6" opacity={flick} />
      <ellipse cx={810} cy={1180} rx={420} ry={160} fill="#5aa9d6" opacity={flick * 0.2} style={{ mixBlendMode: "screen" }} />
      {/* sofa */}
      <path d="M-20 1360 Q-20 1240 80 1240 H460 Q560 1240 560 1360 V1560 H-20 Z" fill="#3a2520" />
      <rect x={-40} y={1380} width={640} height={190} rx={40} fill="#4a2f28" />
      {/* lamp */}
      <rect x={940} y={1180} width={10} height={380} fill="#120b09" />
      <path d="M900 1180 L990 1180 L970 1100 L920 1100 Z" fill={C.glow} opacity={0.9} />
      <Glow x={945} y={1140} r={420} />
    </g>
  );
};

/** First light on a rooftop: a road leading somewhere he has not been. */
export const Dawn: React.FC = () => {
  const f = useCurrentFrame();
  const rise = Math.min(1, f / 150);
  return (
    <g>
      <SkyGrad id="dawnSky" stops={[[0, "#27385c"], [0.4, "#b8607a"], [0.7, "#f2a65a"], [1, "#ffd9a0"]]} />
      <rect width={1080} height={1920} fill="url(#dawnSky)" />
      <circle cx={540} cy={1180 - rise * 120} r={190} fill="#fff1c9" opacity={0.95} />
      <Glow x={540} y={1180 - rise * 120} r={800} flicker={false} />
      <Skyline seed={23} base={1330} minH={150} maxH={420} fill="#4a3358" offset={0} />
      <Skyline seed={51} base={1480} minH={120} maxH={300} fill="#2a1c38" offset={0} />
      {/* a road that narrows toward the sun */}
      <path d="M-200 1920 L460 1420 H620 L1280 1920 Z" fill="#241a2e" />
      <path d="M540 1920 V1440" stroke="#f2a65a" strokeWidth={10} strokeDasharray="60 70" strokeDashoffset={-f * 3} opacity={0.8} />
      <rect y={1480} width={1080} height={440} fill="#1a1224" opacity={0.0} />
    </g>
  );
};

/* ---------------- props ---------------- */

/** A month of days. Each frame count crosses off one more: the same day, again. */
export const Calendar: React.FC = () => {
  const f = useCurrentFrame();
  const done = Math.min(28, Math.floor(f / 4));
  return (
    <g>
      <rect x={-250} y={-300} width={500} height={600} rx={16} fill="#e6dfcb" stroke="#4a3f2c" strokeWidth={6} />
      <rect x={-250} y={-300} width={500} height={90} rx={16} fill="#7a2f33" />
      {Array.from({ length: 28 }, (_, i) => {
        const cx = -190 + (i % 7) * 63, cy = -150 + Math.floor(i / 7) * 90;
        return (
          <g key={i}>
            <text x={cx} y={cy + 10} fontSize={30} fill="#2a2418" textAnchor="middle" fontFamily="sans-serif">{i + 1}</text>
            {i < done && <path d={`M${cx - 22} ${cy - 22} L${cx + 22} ${cy + 26} M${cx + 22} ${cy - 22} L${cx - 22} ${cy + 26}`} stroke="#b02a30" strokeWidth={6} strokeLinecap="round" />}
          </g>
        );
      })}
    </g>
  );
};

/** An alarm clock that shakes when it rings. */
export const Alarm: React.FC = () => {
  const f = useCurrentFrame();
  const shake = Math.sin(f * 1.7) * 5;
  return (
    <g transform={`rotate(${shake})`}>
      <Glow x={0} y={0} r={360} />
      <circle cx={-150} cy={-210} r={60} fill={C.brass} /><circle cx={150} cy={-210} r={60} fill={C.brass} />
      <circle r={210} fill="#1c2227" stroke={C.steel} strokeWidth={10} />
      <circle r={178} fill="#d9d2bd" />
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x={-4} y={-160} width={8} height={i % 3 === 0 ? 30 : 16} fill="#23303a" transform={`rotate(${i * 30})`} />)}
      <rect x={-6} y={-110} width={12} height={116} rx={4} fill="#1a1a1a" />
      <rect x={-5} y={-150} width={10} height={156} rx={4} fill="#1a1a1a" transform="rotate(180)" />
      <circle r={14} fill="#b02a30" />
    </g>
  );
};

export const Tiffin: React.FC = () => (
  <g>
    {[0, 1, 2].map((i) => <rect key={i} x={-120} y={-150 + i * 100} width={240} height={92} rx={14} fill={i === 1 ? "#b9bec2" : "#9aa1a6"} stroke="#4a5258" strokeWidth={5} />)}
    <path d="M-110 -150 Q0 -290 110 -150" stroke="#4a5258" strokeWidth={10} fill="none" />
    <circle cx={0} cy={-232} r={16} fill="#4a5258" />
  </g>
);

/** A resignation letter. The signature draws itself. */
export const Letter: React.FC = () => {
  const f = useCurrentFrame();
  const sign = Math.min(1, Math.max(0, (f - 20) / 50));
  return (
    <g transform="rotate(-3)">
      <rect x={-210} y={-290} width={420} height={580} fill="#e9e2cf" stroke="#9b9078" strokeWidth={4} />
      <rect x={-160} y={-230} width={160} height={14} fill="#2a2418" opacity={0.8} />
      {Array.from({ length: 8 }, (_, i) => <rect key={i} x={-160} y={-160 + i * 36} width={i % 3 === 2 ? 220 : 320} height={8} fill="#2a2418" opacity={0.35} />)}
      <path d="M-150 190 q30 -70 50 -10 t60 -10 t60 -20 t40 10" stroke="#1d3a8a" strokeWidth={6} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - sign} />
    </g>
  );
};

export const CITY_LOCATIONS: Record<string, React.FC> = { road: Road, office: Office, home: Home, dawn: Dawn };
export const CITY_PROPS: Record<string, React.FC> = { calendar: Calendar, alarm: Alarm, tiffin: Tiffin, letter: Letter };
