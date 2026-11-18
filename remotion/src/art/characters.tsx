import React, { useId } from "react";
import { C } from "./palette";

/**
 * The season's recurring cast. Each person is defined ONCE here from CONTINUITY_BIBLE.json's `visual_anchor`,
 * so they look identical in every episode. Figures are drawn as bust portraits with the origin at the bottom centre
 * (head centre at y = -640). Faces are minimal on purpose: a few features, half in shadow.
 */
export type CharacterId = "MEERA" | "KABIR" | "RAHIM" | "TARA" | "NANDINI" | "VIKRAM" | "VINAY" | "DEEPA" | "ARJUN";

type Look = {
  skin: string;
  hair: string;
  outfit: string;
  trim?: string;
  hairStyle: "long" | "short" | "bun" | "plait" | "balding";
  extras: Array<"beard" | "stubble" | "mustache" | "glasses" | "headphones" | "hood" | "strap" | "lanyard" | "pallu" | "collar" | "badge" | "camera">;
  age: number;
};

export const LOOKS: Record<CharacterId, Look> = {
  MEERA: { skin: "#b5835a", hair: "#0b0b0e", outfit: "#1f5a43", trim: "#c9b98a", hairStyle: "long", extras: ["strap"], age: 28 },
  KABIR: { skin: "#a9744f", hair: "#111114", outfit: "#2b2f3a", hairStyle: "short", extras: ["hood", "headphones"], age: 30 },
  RAHIM: { skin: "#9a6b48", hair: "#e8e6e0", outfit: "#d8cfbb", hairStyle: "balding", extras: ["beard", "glasses"], age: 68 },
  TARA: { skin: "#b07a55", hair: "#14110f", outfit: "#2f5d9a", hairStyle: "bun", extras: ["lanyard"], age: 30 },
  NANDINI: { skin: "#b4825c", hair: "#9c9a98", outfit: "#8a6a5a", trim: "#d8c9a8", hairStyle: "bun", extras: ["pallu"], age: 55 },
  VIKRAM: { skin: "#a87a58", hair: "#3a3a3d", outfit: "#26262c", trim: "#e9e6df", hairStyle: "short", extras: ["collar"], age: 55 },
  VINAY: { skin: "#a57652", hair: "#1c1a1a", outfit: "#6b6a55", hairStyle: "short", extras: ["stubble"], age: 40 },
  DEEPA: { skin: "#b3805a", hair: "#120f0f", outfit: "#7a3b4a", hairStyle: "plait", extras: ["badge"], age: 35 },
  ARJUN: { skin: "#a97a55", hair: "#16130f", outfit: "#4a4a40", hairStyle: "short", extras: ["mustache", "camera", "badge"], age: 35 },
};

const HEAD = { cx: 0, cy: -640, rx: 105, ry: 130 };

const Hair: React.FC<{ look: Look; back?: boolean }> = ({ look, back }) => {
  const { hair, hairStyle } = look;
  if (back) {
    if (hairStyle === "long") return <path d="M-125 -690 Q-170 -430 -140 -300 L-60 -420 L60 -420 L140 -300 Q170 -430 125 -690 Z" fill={hair} />;
    return null;
  }
  switch (hairStyle) {
    case "long":
      return <path d="M-112 -640 Q-125 -790 0 -795 Q125 -790 112 -640 Q95 -720 20 -735 Q-60 -730 -112 -640 Z" fill={hair} />;
    case "short":
      return <path d="M-110 -655 Q-120 -785 0 -790 Q120 -785 110 -655 Q85 -735 0 -740 Q-85 -735 -110 -655 Z" fill={hair} />;
    case "balding":
      return (
        <g fill={hair}>
          <path d="M-108 -640 Q-125 -720 -85 -745 Q-98 -690 -92 -640 Z" />
          <path d="M108 -640 Q125 -720 85 -745 Q98 -690 92 -640 Z" />
        </g>
      );
    case "bun":
      return (
        <g fill={hair}>
          <circle cx={0} cy={-800} r={42} />
          <path d="M-108 -650 Q-118 -790 0 -795 Q118 -790 108 -650 Q80 -735 0 -742 Q-80 -735 -108 -650 Z" />
        </g>
      );
    case "plait":
      return (
        <g fill={hair}>
          <path d="M-108 -650 Q-118 -790 0 -795 Q118 -790 108 -650 Q80 -735 0 -742 Q-80 -735 -108 -650 Z" />
          <path d="M70 -560 Q130 -480 120 -330 Q100 -250 80 -240 Q88 -360 60 -470 Z" />
        </g>
      );
  }
};

export const Character: React.FC<{
  id: CharacterId;
  x?: number;
  y?: number;
  scale?: number;
  flip?: boolean;
  /** 0 = face lit, 1 = almost a silhouette */
  shadow?: number;
  /** show a face, or only hair and shoulders (keeps identity, hides detail) */
  face?: boolean;
}> = ({ id, x = 540, y = 1850, scale = 1.3, flip = false, shadow = 0.2, face = true }) => {
  const look = LOOKS[id];
  const clip = "head" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const has = (e: Look["extras"][number]) => look.extras.includes(e);
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`} style={{ filter: `drop-shadow(-7px 0 0 ${C.amber}cc) brightness(${1 - shadow * 0.6})` }}>
      <Hair look={look} back />
      {has("hood") && <path d="M-215 -330 Q-200 -480 -110 -500 L110 -500 Q200 -480 215 -330 L120 -400 L-120 -400 Z" fill="#1f232c" />}
      {/* shoulders and torso */}
      <path d="M-285 0 L-272 -330 Q-250 -425 -130 -445 L130 -445 Q250 -425 272 -330 L285 0 Z" fill={look.outfit} />
      {has("collar") && (
        <g>
          <path d="M-70 -445 L0 -330 L70 -445 Z" fill={look.trim} />
          <path d="M-70 -445 L-150 -360 L-30 -300 L0 -330 Z M70 -445 L150 -360 L30 -300 L0 -330 Z" fill="#1b1b20" />
        </g>
      )}
      {has("strap") && (
        <g>
          <path d="M-230 -380 L-190 -440 L270 -60 L240 0 Z" fill="#b9a77c" />
          <rect x={150} y={-110} width={150} height={130} rx={16} fill="#a89868" />
        </g>
      )}
      {has("pallu") && <path d="M-250 -380 Q-60 -470 270 -250 L285 0 L60 0 Q-80 -200 -250 -380 Z" fill={look.trim} opacity={0.9} />}
      {has("lanyard") && (
        <g>
          <path d="M-70 -445 L0 -190 L70 -445" fill="none" stroke="#d9d4c0" strokeWidth={5} />
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={-22 + (i % 2) * 6} y={-250 + i * 30} width={44} height={56} rx={4} fill="#e8dfc6" stroke="#8a7f66" strokeWidth={2} transform={`rotate(${(i - 2) * 4} 0 ${-230 + i * 30})`} />)}
        </g>
      )}
      {has("badge") && <rect x={110} y={-260} width={78} height={104} rx={6} fill="#e9e4d2" stroke="#6a6556" strokeWidth={3} />}
      {has("camera") && (
        <g>
          <path d="M-60 -445 L-170 -150" stroke="#2a2a2a" strokeWidth={14} fill="none" />
          <rect x={-250} y={-190} width={160} height={110} rx={14} fill="#1c1c1c" />
          <circle cx={-170} cy={-135} r={38} fill="#0d0d0d" stroke="#555" strokeWidth={6} />
        </g>
      )}
      {/* neck and head */}
      <rect x={-38} y={-520} width={76} height={100} fill={look.skin} />
      <rect x={-38} y={-520} width={76} height={40} fill={C.ink} opacity={0.35} />
      <ellipse cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry} fill={look.skin} />
      <clipPath id={clip}><ellipse cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry} /></clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect x={5} y={-800} width={130} height={320} fill={C.ink} opacity={0.4 + shadow * 0.35} />
        {has("beard") && <path d="M-105 -620 Q-100 -470 0 -455 Q100 -470 105 -620 Q60 -540 0 -535 Q-60 -540 -105 -620 Z" fill={look.hair} />}
        {has("stubble") && <path d="M-105 -600 Q-90 -500 0 -495 Q90 -500 105 -600 L100 -520 Q0 -440 -100 -520 Z" fill={C.ink} opacity={0.3} />}
      </g>
      {has("mustache") && <path d="M-46 -585 Q0 -610 46 -585 Q0 -595 -46 -585 Z" fill={look.hair} />}
      {face && (
        <g>
          <ellipse cx={-42} cy={-650} rx={14} ry={7} fill={C.ink} opacity={0.9} />
          <ellipse cx={44} cy={-650} rx={14} ry={7} fill={C.ink} opacity={0.7} />
          <path d="M-62 -678 Q-42 -690 -22 -680 M24 -680 Q44 -690 64 -678" stroke={look.hair === "#e8e6e0" ? "#cfcfc8" : C.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
          <path d="M-4 -640 Q-12 -600 4 -596" stroke={C.ink} strokeWidth={4} fill="none" opacity={0.35} />
        </g>
      )}
      {has("glasses") && (
        <g fill="none" stroke="#2a2118" strokeWidth={6}>
          <circle cx={-44} cy={-650} r={30} />
          <circle cx={44} cy={-650} r={30} />
          <path d="M-14 -650 H14" />
        </g>
      )}
      <Hair look={look} />
      {has("headphones") && (
        <g>
          <path d="M-118 -650 Q-125 -810 0 -815 Q125 -810 118 -650" stroke="#101216" strokeWidth={16} fill="none" />
          <rect x={-140} y={-690} width={36} height={86} rx={16} fill="#101216" />
          <rect x={104} y={-690} width={36} height={86} rx={16} fill="#101216" />
        </g>
      )}
    </g>
  );
};

export const CHARACTER_IDS = Object.keys(LOOKS) as CharacterId[];
