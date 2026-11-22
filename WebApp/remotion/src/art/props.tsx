import React from "react";
import { useCurrentFrame } from "remotion";
import { C } from "./palette";
import { Glow } from "./fx";
import { CITY_PROPS } from "./city";

/** Props are centred on (0,0), about 400 units wide. Art.tsx positions and scales them. */
type P = { glow?: boolean };

/** The town clock, stopped at 11:59. `glow` makes it ring: the thirteenth bell. */
export const Clock: React.FC<P> = ({ glow }) => {
  const f = useCurrentFrame();
  const pulse = glow ? (f % 75) / 75 : 0;
  return (
    <g>
      {glow && <Glow x={0} y={0} r={420} />}
      {glow && <circle r={270 + pulse * 150} fill="none" stroke={C.amber} strokeWidth={6} opacity={1 - pulse} />}
      <circle r={280} fill={C.brass} />
      <circle r={262} fill="#cdbf9c" />
      <circle r={262} fill="none" stroke="#5d4a28" strokeWidth={8} />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={-6} y={-244} width={12} height={i % 3 === 0 ? 46 : 26} fill="#2a2118" transform={`rotate(${i * 30})`} />
      ))}
      <rect x={-9} y={-150} width={18} height={160} rx={6} fill="#1d150d" transform="rotate(-2)" />
      <rect x={-6} y={-225} width={12} height={235} rx={5} fill="#1d150d" transform="rotate(-6)" />
      <circle r={16} fill="#1d150d" />
      <path d="M60 -250 L20 -110 L70 -40 L30 40" stroke="#4b3f2a" strokeWidth={4} fill="none" opacity={0.7} />
    </g>
  );
};

export const Envelope: React.FC = () => (
  <g>
    <rect x={-240} y={-165} width={480} height={330} rx={8} fill="#a68a5c" />
    <path d="M-240 -165 L0 40 L240 -165 Z" fill="#b99c6a" />
    <path d="M-240 165 L-60 10 M240 165 L60 10" stroke="#7d6740" strokeWidth={4} fill="none" />
    <rect x={150} y={-140} width={70} height={84} fill="#c9b78d" stroke="#7d6740" strokeWidth={3} />
    {[0, 1, 2].map((i) => <rect key={i} x={-190} y={60 + i * 26} width={210 - i * 40} height={8} fill="#4a3a22" opacity={0.6} />)}
    <rect x={-190} y={-110} width={150} height={9} fill="#7d3b2c" opacity={0.7} />
  </g>
);

export const Recorder: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <g>
      <rect x={-210} y={-130} width={420} height={260} rx={24} fill="#1d252a" stroke={C.steel} strokeWidth={5} />
      {[-95, 95].map((cx, i) => (
        <g key={i} transform={`translate(${cx} -10) rotate(${f * (i ? 6 : 5)})`}>
          <circle r={64} fill="#0c1114" stroke={C.steel} strokeWidth={5} />
          {[0, 120, 240].map((a) => <rect key={a} x={-5} y={-54} width={10} height={40} fill={C.steel} transform={`rotate(${a})`} />)}
        </g>
      ))}
      <circle cx={170} cy={-100} r={10} fill={C.red} opacity={f % 40 < 24 ? 1 : 0.25} />
      <rect x={-150} y={84} width={300} height={22} rx={6} fill="#10171a" />
    </g>
  );
};

/** A child's shadow stretched on a lit wall: the mystery voice. */
export const ChildShadow: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <g opacity={0.82 + Math.sin(f / 10) * 0.08}>
      <rect x={-230} y={-330} width={460} height={660} fill="url(#glowGrad)" opacity={0.35} />
      <g filter="url(#blur12)" fill={C.ink}>
        <circle cx={0} cy={-120} r={52} />
        <path d="M-70 -50 Q0 -90 70 -50 L88 230 L-88 230 Z" />
        <rect x={-24} y={-80} width={48} height={50} />
      </g>
    </g>
  );
};

export const Files: React.FC = () => (
  <g>
    {[0, 1, 2].map((i) => (
      <rect key={i} x={-210 + i * 12} y={-60 - i * 28} width={420} height={110} rx={6} fill={i === 1 ? "#c4b48c" : C.paper} stroke={C.paperDark} strokeWidth={3} transform={`rotate(${(i - 1) * 3})`} />
    ))}
    <path d="M-210 -10 H210 M0 -150 V90" stroke="#8a7a52" strokeWidth={5} />
  </g>
);

export const Register: React.FC = () => (
  <g>
    <path d="M-300 -180 L0 -150 L300 -180 L300 170 L0 190 L-300 170 Z" fill={C.paper} stroke={C.paperDark} strokeWidth={4} />
    <path d="M0 -150 V190" stroke={C.paperDark} strokeWidth={6} />
    {Array.from({ length: 9 }, (_, i) => (
      <g key={i} opacity={0.55}>
        <rect x={-270} y={-120 + i * 32} width={230 - (i % 3) * 30} height={7} fill="#3a2f1c" />
        <rect x={40} y={-120 + i * 32} width={220 - (i % 4) * 25} height={7} fill="#3a2f1c" />
      </g>
    ))}
  </g>
);

export const Photo: React.FC = () => (
  <g transform="rotate(-4)">
    <rect x={-210} y={-260} width={420} height={520} fill="#e8e0cc" />
    <rect x={-186} y={-236} width={372} height={430} fill="#6c5a40" />
    <rect x={-186} y={-236} width={372} height={430} fill="url(#glowGrad)" opacity={0.25} />
    <g fill="#2a2116" opacity={0.9}>
      <circle cx={-60} cy={-80} r={34} /><path d="M-110 0 Q-60 -40 -10 0 L-6 194 L-114 194 Z" />
      <circle cx={70} cy={-60} r={30} /><path d="M26 10 Q70 -22 114 10 L118 194 L22 194 Z" />
    </g>
  </g>
);

export const MapSheet: React.FC = () => (
  <g>
    <rect x={-300} y={-220} width={600} height={440} fill="#cdbd94" stroke={C.paperDark} strokeWidth={4} />
    {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M${-300 + i * 120} -220 V220 M-300 ${-220 + i * 88} H300`} stroke="#9a8a62" strokeWidth={2} opacity={0.6} />)}
    <path d="M-300 120 Q-100 -40 40 40 T300 -120" stroke={C.tealLight} strokeWidth={22} fill="none" opacity={0.7} />
    {[[-120, -60], [60, 90], [180, -40]].map(([x, y], i) => (
      <path key={i} d={`M${x - 24} ${y - 24} L${x + 24} ${y + 24} M${x + 24} ${y - 24} L${x - 24} ${y + 24}`} stroke={C.red} strokeWidth={10} strokeLinecap="round" />
    ))}
  </g>
);

export const TapeMachine: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <g>
      <rect x={-300} y={-200} width={600} height={400} rx={20} fill="#242b30" stroke={C.steel} strokeWidth={5} />
      {[-130, 130].map((cx, i) => (
        <g key={i} transform={`translate(${cx} -30) rotate(${f * 3 * (i ? 1 : 1.2)})`}>
          <circle r={96} fill="#0c1114" stroke="#8a969c" strokeWidth={6} />
          {[0, 60, 120, 180, 240, 300].map((a) => <rect key={a} x={-6} y={-84} width={12} height={46} fill="#8a969c" transform={`rotate(${a})`} />)}
        </g>
      ))}
      <path d="M-130 66 L130 66" stroke="#5a3a24" strokeWidth={8} />
      <rect x={-250} y={120} width={500} height={44} rx={8} fill="#161c20" />
    </g>
  );
};

export const Waveform: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <g>
      {Array.from({ length: 41 }, (_, i) => {
        const gap = Math.abs(i - 20) < 5;
        const h = gap ? 6 : 30 + Math.abs(Math.sin(i * 0.9 + f / 6)) * 150 * (1 - Math.abs(i - 20) / 40);
        return <rect key={i} x={-300 + i * 15} y={-h / 2} width={9} height={h} rx={4} fill={gap ? C.red : C.amber} opacity={gap ? 0.9 : 0.85} />;
      })}
    </g>
  );
};

export const Lantern: React.FC = () => (
  <g>
    <Glow x={0} y={0} r={360} />
    <rect x={-60} y={-110} width={120} height={200} rx={14} fill="#241a10" stroke={C.brass} strokeWidth={6} />
    <rect x={-40} y={-80} width={80} height={140} rx={8} fill={C.glow} />
    <path d="M-50 -110 Q0 -190 50 -110" fill="none" stroke={C.brass} strokeWidth={8} />
  </g>
);

export const IdCards: React.FC = () => (
  <g>
    <path d="M-280 -120 Q0 -40 280 -120" stroke="#d9d4c0" strokeWidth={5} fill="none" />
    {[-210, -70, 70, 210].map((x, i) => (
      <g key={i} transform={`translate(${x} ${-70 + (i % 2) * 24}) rotate(${(i - 1.5) * 5})`}>
        <rect x={-50} y={0} width={100} height={140} rx={8} fill="#e8dfc6" stroke="#6a6556" strokeWidth={3} />
        <circle cy={44} r={22} fill="#7a6a54" /><rect x={-32} y={86} width={64} height={8} fill="#6a6556" /><rect x={-32} y={104} width={44} height={8} fill="#6a6556" />
      </g>
    ))}
  </g>
);

export const Gear: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <g transform={`rotate(${f * 0.8})`}>
      {Array.from({ length: 14 }, (_, i) => <rect key={i} x={-22} y={-250} width={44} height={70} fill={C.brass} transform={`rotate(${(i * 360) / 14})`} />)}
      <circle r={210} fill={C.brass} />
      <circle r={150} fill="#2a2118" />
      {[0, 72, 144, 216, 288].map((a) => <rect key={a} x={-18} y={-148} width={36} height={148} fill={C.brass} transform={`rotate(${a})`} />)}
      <circle r={36} fill="#3a2d18" />
    </g>
  );
};

export const SirenTower: React.FC = () => (
  <g>
    <path d="M-30 480 L-14 -120 H14 L30 480 Z" fill="#1a2a30" />
    <path d="M-110 -150 L110 -260 L110 -60 L-110 -110 Z" fill="#3a4a50" />
    <ellipse cx={-110} cy={-130} rx={26} ry={46} fill="#26343a" />
    <circle cx={0} cy={-300} r={14} fill={C.red} />
  </g>
);

export const WindowShadows: React.FC = () => (
  <g>
    <rect x={-170} y={-230} width={340} height={460} fill="#10252c" stroke="#3a4a50" strokeWidth={12} />
    <rect x={-150} y={-210} width={300} height={420} fill={C.amber} opacity={0.75} />
    <path d="M0 -210 V210 M-150 0 H150" stroke="#3a4a50" strokeWidth={10} />
    <g fill={C.ink} opacity={0.9}>
      <circle cx={-60} cy={-20} r={30} /><path d="M-100 40 Q-60 10 -20 40 L-18 210 L-102 210 Z" />
      <circle cx={70} cy={0} r={28} /><path d="M32 60 Q70 30 108 60 L110 210 L30 210 Z" />
    </g>
  </g>
);

export const Water: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M-700 ${i * 60} Q-500 ${-40 + Math.sin(f / 18 + i) * 30} -300 ${i * 60} T100 ${i * 60} T500 ${i * 60} T900 ${i * 60} V500 H-700 Z`} fill={i === 0 ? C.tealLight : i === 1 ? C.teal : C.night} opacity={0.75} />
      ))}
    </g>
  );
};

export const Headline: React.FC = () => (
  <g>
    <rect x={-250} y={-340} width={500} height={680} fill="#d8d0b8" stroke={C.paperDark} strokeWidth={3} />
    <rect x={-220} y={-310} width={440} height={64} fill="#15110c" />
    <rect x={-220} y={-224} width={250} height={10} fill="#15110c" />
    <rect x={-220} y={-200} width={210} height={150} fill="#7c705a" />
    {Array.from({ length: 12 }, (_, i) => <rect key={i} x={i % 2 ? 20 : -220} y={-210 + i * 24} width={i % 2 ? 200 : 210} height={7} fill="#3a2f1c" opacity={0.6} />)}
  </g>
);

export const Diary: React.FC = () => (
  <g>
    <rect x={-190} y={-250} width={380} height={500} rx={12} fill="#5a3326" stroke="#2a150e" strokeWidth={6} />
    <rect x={-190} y={-250} width={36} height={500} fill="#3b1f16" />
    <rect x={-60} y={-170} width={190} height={110} rx={8} fill="#c9b98a" opacity={0.85} />
    <path d="M140 250 V330" stroke={C.red} strokeWidth={14} />
  </g>
);

export const Screen: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <g>
      <rect x={-300} y={-200} width={600} height={400} rx={14} fill="#05100f" stroke={C.steel} strokeWidth={8} />
      {Array.from({ length: 10 }, (_, i) => <rect key={i} x={-260} y={-160 + i * 34} width={180 + ((i * 53) % 260)} height={9} fill={i === Math.floor(f / 12) % 10 ? C.amber : "#3fa59d"} opacity={0.8} />)}
    </g>
  );
};

export const Phone: React.FC = () => (
  <g>
    <rect x={-120} y={-230} width={240} height={460} rx={34} fill="#0b1013" stroke={C.steel} strokeWidth={6} />
    <rect x={-100} y={-206} width={200} height={410} rx={20} fill="#16323a" />
    <Glow x={0} y={0} r={260} flicker={false} />
    <rect x={-70} y={-120} width={140} height={14} fill={C.glow} opacity={0.8} /><rect x={-70} y={-80} width={100} height={14} fill={C.glow} opacity={0.5} />
  </g>
);

export const PROPS: Record<string, React.FC<P>> = {
  clock: Clock, "clock-ringing": (p) => <Clock {...p} glow />, envelope: Envelope, recorder: Recorder, "child-shadow": ChildShadow,
  files: Files, register: Register, photo: Photo, map: MapSheet, tape: TapeMachine, waveform: Waveform, lantern: Lantern,
  idcards: IdCards, gear: Gear, siren: SirenTower, "window-shadows": WindowShadows, water: Water, headline: Headline,
  diary: Diary, screen: Screen, phone: Phone, ...CITY_PROPS,
};
export const PROP_IDS = Object.keys(PROPS);
