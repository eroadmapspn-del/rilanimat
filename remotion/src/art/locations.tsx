import React from "react";
import { C, rand } from "./palette";
import { Beam, Glow } from "./fx";

/** Backdrops for the 13 places in CONTINUITY_BIBLE.json. Each fills the 1080x1920 canvas. */
const Sky: React.FC = () => <rect width={1080} height={1920} fill="url(#skyGrad)" />;
const Ground: React.FC<{ y?: number; color?: string }> = ({ y = 1500, color = "#04110f" }) => <rect y={y} width={1080} height={1920 - y} fill={color} />;
const Windows: React.FC<{ x: number; y: number; cols: number; rows: number; lit?: number; w?: number; h?: number; gap?: number }> = ({ x, y, cols, rows, lit = 0.3, w = 46, h = 70, gap = 30 }) => (
  <g>
    {Array.from({ length: cols * rows }, (_, i) => {
      const cx = i % cols, cy = Math.floor(i / cols);
      const on = rand(i + x) < lit;
      return <rect key={i} x={x + cx * (w + gap)} y={y + cy * (h + gap)} width={w} height={h} fill={on ? C.amber : "#0b1d22"} opacity={on ? 0.85 : 1} />;
    })}
  </g>
);

export const ClockTower: React.FC = () => (
  <g>
    <Sky />
    {[[80, 1150, 130], [880, 1220, 110], [740, 1280, 90]].map(([x, y, w], i) => <rect key={i} x={x} y={y} width={w} height={700} fill="#06141a" />)}
    <path d="M350 1700 L380 700 H700 L730 1700 Z" fill="#0a1d24" />
    <path d="M330 700 L540 470 L750 700 Z" fill="#07161c" />
    <circle cx={540} cy={820} r={150} fill="#c9bb98" opacity={0.9} /><Glow x={540} y={820} r={420} />
    <Ground y={1650} />
  </g>
);

export const Archive: React.FC = () => (
  <g>
    <rect width={1080} height={1920} fill="#08171c" />
    {[0, 1, 2].map((c) => (
      <g key={c} transform={`translate(${60 + c * 340} 300)`}>
        <rect width={300} height={1300} fill="#1a1612" />
        {Array.from({ length: 7 }, (_, r) => <g key={r}><rect y={r * 185 + 150} width={300} height={10} fill="#3a2d1f" />{Array.from({ length: 5 }, (_, b) => <rect key={b} x={14 + b * 56} y={r * 185 + 30 + rand(r * 7 + b + c) * 30} width={44} height={120 - rand(b + r) * 30} fill={rand(b + c * 3 + r) > 0.5 ? "#6a5a40" : "#4a3d2a"} />)}</g>)}
      </g>
    ))}
    <Beam x={540} y={0} spread={420} length={1500} opacity={0.22} />
  </g>
);

export const School: React.FC = () => (
  <g>
    <Sky />
    <rect x={60} y={900} width={960} height={800} fill="#10242a" />
    <path d="M30 900 L540 640 L1050 900 Z" fill="#0a1a20" />
    <Windows x={120} y={960} cols={5} rows={2} lit={0.15} w={90} h={110} gap={60} />
    <rect x={480} y={1400} width={120} height={300} fill="#050d10" />
    <circle cx={540} cy={760} r={26} fill={C.brass} /><path d="M520 790 H560 L550 830 H530 Z" fill={C.brass} />
    <Ground y={1700} />
  </g>
);

export const Tunnel: React.FC = () => (
  <g>
    <rect width={1080} height={1920} fill="#040d10" />
    {Array.from({ length: 9 }, (_, i) => {
      const s = 1 - i * 0.1;
      return <path key={i} d={`M${540 - 520 * s} 1500 V${760 + i * 40} Q540 ${300 + i * 80} ${540 + 520 * s} ${760 + i * 40} V1500 Z`} fill="none" stroke={i % 2 ? "#14272d" : "#1d3a40"} strokeWidth={40 * s + 6} />;
    })}
    <rect x={0} y={1500} width={1080} height={420} fill="#0a2a30" opacity={0.9} />
    <Glow x={540} y={1000} r={380} />
  </g>
);

export const ClockShop: React.FC = () => (
  <g>
    <rect width={1080} height={1920} fill="#0a1a1f" />
    {Array.from({ length: 12 }, (_, i) => {
      const x = 120 + (i % 3) * 330, y = 260 + Math.floor(i / 3) * 280;
      return <g key={i}><circle cx={x} cy={y} r={95} fill="#cbbd9a" opacity={0.85} /><circle cx={x} cy={y} r={95} fill="none" stroke={C.brass} strokeWidth={10} /><path d={`M${x} ${y} L${x + 40 * (rand(i) - 0.5)} ${y - 60} M${x} ${y} L${x + 50} ${y + 10 * rand(i + 3)}`} stroke="#2a2118" strokeWidth={8} /></g>;
    })}
    <rect y={1400} width={1080} height={520} fill="#2b1d12" />
    <Glow x={540} y={1380} r={420} />
  </g>
);

export const PumpStation: React.FC = () => (
  <g>
    <rect width={1080} height={1920} fill="#07171b" />
    <rect x={100} y={500} width={300} height={1100} rx={40} fill="#16303a" />
    <rect x={640} y={800} width={340} height={800} rx={20} fill="#1b3a42" />
    <path d="M400 900 H640 M400 1200 H640" stroke="#2c5560" strokeWidth={50} />
    {[[250, 700], [810, 930]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r={70} fill="#c9bb98" /><path d={`M${x} ${y} L${x + 40} ${y - 30}`} stroke={C.red} strokeWidth={8} /></g>)}
    <Ground y={1600} color="#0b2a30" />
  </g>
);

export const Reservoir: React.FC = () => (
  <g>
    <Sky />
    <path d="M0 800 Q300 700 540 760 T1080 700 V1920 H0 Z" fill="#0c262c" />
    <path d="M0 1100 H1080 V1920 H0 Z" fill="#103a42" opacity={0.9} />
    <rect x={560} y={560} width={420} height={300} fill="#12282e" /><Windows x={590} y={600} cols={4} rows={1} lit={0.8} w={70} h={60} gap={26} />
    <Glow x={780} y={640} r={300} />
  </g>
);

export const Hospital: React.FC = () => (
  <g>
    <rect width={1080} height={1920} fill="#0a1d22" />
    {Array.from({ length: 6 }, (_, i) => <rect key={i} x={540 - 380 * (1 - i * 0.14)} y={300 + i * 150} width={760 * (1 - i * 0.14)} height={26} fill="#cfe7e3" opacity={0.65 - i * 0.06} />)}
    <path d="M0 1920 L400 900 H680 L1080 1920 Z" fill="#12333a" />
    <rect x={430} y={900} width={220} height={560} fill="#06141a" />
    <path d="M500 760 H580 V800 H620 V860 H580 V900 H500 V860 H460 V800 H500 Z" fill={C.red} opacity={0.8} />
  </g>
);

export const RadioStation: React.FC = () => (
  <g>
    <rect width={1080} height={1920} fill="#07151a" />
    <path d="M540 200 L440 1300 H640 Z" fill="none" stroke="#2a4650" strokeWidth={10} />
    {[500, 750, 1000].map((y) => <path key={y} d={`M${540 - (y - 200) * 0.09} ${y} H${540 + (y - 200) * 0.09}`} stroke="#2a4650" strokeWidth={8} />)}
    <circle cx={540} cy={190} r={16} fill={C.red} />
    <rect x={200} y={1250} width={680} height={320} fill="#10242a" />
    <rect x={250} y={1300} width={160} height={60} fill="#2a0e0e" /><rect x={250} y={1300} width={160} height={60} fill={C.red} opacity={0.12} />
    <Ground y={1560} color="#0b1d22" />
  </g>
);

export const Platform: React.FC = () => (
  <g>
    <Sky />
    <path d="M0 1920 L520 1000 H560 L1080 1920 Z" fill="#0b1b20" />
    {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${540 - (60 + i * 90)} ${1000 + i * 150} H${540 + (60 + i * 90)}`} stroke="#2a3a40" strokeWidth={6 + i * 3} />)}
    {[250, 830].map((x, i) => <g key={i}><rect x={x} y={560} width={14} height={900} fill="#1a2a30" /><Glow x={x + 7} y={560} r={220} /></g>)}
    <rect x={0} y={1580} width={1080} height={340} fill="#06151a" />
  </g>
);

export const Siren: React.FC = () => (
  <g>
    <Sky />
    <path d="M440 1700 L500 360 H580 L640 1700 Z" fill="#0b1a20" />
    <path d="M380 340 L760 200 L760 440 L380 400 Z" fill="#26343a" />
    <circle cx={540} cy={300} r={18} fill={C.red} /><Glow x={540} y={300} r={260} />
    <Ground y={1700} />
  </g>
);

export const Resort: React.FC = () => (
  <g>
    <Sky />
    <rect x={80} y={900} width={920} height={500} fill="#0c1f26" /><Windows x={130} y={950} cols={6} rows={3} lit={0.5} w={80} h={70} gap={38} />
    <path d="M900 1100 Q860 900 780 860 M900 1100 Q950 920 1030 900 M900 1100 Q880 960 900 820" stroke="#050f12" strokeWidth={14} fill="none" />
    <rect x={0} y={1400} width={1080} height={520} fill="#0f4a52" opacity={0.7} /><Glow x={540} y={1400} r={400} />
  </g>
);

export const Godown: React.FC = () => (
  <g>
    <rect width={1080} height={1920} fill="#0a1a1f" />
    {Array.from({ length: 24 }, (_, i) => <rect key={i} x={40 + (i % 4) * 250} y={700 + Math.floor(i / 4) * 150} width={230} height={130} rx={6} fill={rand(i) > 0.5 ? "#5a4a34" : "#6b5a3e"} />)}
    <path d="M540 0 V380" stroke="#333" strokeWidth={4} /><circle cx={540} cy={400} r={26} fill={C.glow} /><Glow x={540} y={400} r={520} />
    <Ground y={1600} color="#08161a" />
  </g>
);

export const Generic: React.FC = () => (
  <g>
    <Sky />
    <rect x={0} y={1350} width={1080} height={570} fill="#071a1f" />
    <Glow x={820} y={500} r={460} />
  </g>
);

export const LOCATIONS: Record<string, React.FC> = {
  "clock-tower": ClockTower, archive: Archive, school: School, tunnel: Tunnel, "clock-shop": ClockShop, "pump-station": PumpStation,
  reservoir: Reservoir, hospital: Hospital, "radio-station": RadioStation, platform: Platform, "siren-tower": Siren, resort: Resort,
  godown: Godown, generic: Generic,
};
export const LOCATION_IDS = Object.keys(LOCATIONS);
