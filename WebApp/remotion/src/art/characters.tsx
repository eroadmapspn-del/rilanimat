import React, { useId } from "react";
import { useCurrentFrame } from "remotion";
import { C } from "./palette";

/**
 * The season's recurring cast. Each person is defined ONCE here from CONTINUITY_BIBLE.json's `visual_anchor`,
 * so they look identical in every episode. Figures are drawn as bust portraits with the origin at the bottom centre
 * (head centre at y = -640). Faces are minimal on purpose: a few features, half in shadow.
 */
export type CharacterId = "MEERA" | "KABIR" | "RAHIM" | "TARA" | "NANDINI" | "VIKRAM" | "VINAY" | "DEEPA" | "ARJUN" | "CHILD" | "CHOWKIDAR" | "OFFICER" | "NURSE" | "RAJAT" | "AARAV" | "NEERAJ";
/** Zameen Ke Neeche has its own cast (AARAV, NEERAJ, ...). Do not reuse Terahvi characters in it, or the other way round. */
export type Mood = "calm" | "worried" | "shock" | "sad" | "stern" | "tired" | "happy" | "resolute";
export type Action = "idle" | "walk" | "slump" | "lookup" | "nod";

export type Look = {
  skin: string;
  hair: string;
  outfit: string;
  trim?: string;
  hairStyle: "long" | "short" | "bun" | "plait" | "balding";
  extras: Array<"beard" | "stubble" | "mustache" | "glasses" | "headphones" | "hood" | "strap" | "lanyard" | "pallu" | "collar" | "badge" | "camera" | "cap" | "whitecoat" | "tie">;
  age: number;
  /** body size relative to an adult; children are drawn smaller */
  size?: number;
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
  // supporting cast: people the narration mentions by role, kept consistent too
  CHILD: { skin: "#b78a63", hair: "#0d0b0b", outfit: "#a8553e", hairStyle: "plait", extras: [], age: 9, size: 0.72 },
  CHOWKIDAR: { skin: "#9c6e4c", hair: "#2a2724", outfit: "#6f6a52", hairStyle: "short", extras: ["cap", "mustache", "badge"], age: 58 },
  OFFICER: { skin: "#a97c59", hair: "#2a2a2c", outfit: "#3a4252", trim: "#e9e6df", hairStyle: "short", extras: ["collar", "badge"], age: 45 },
  RAJAT: { skin: "#a9744f", hair: "#15120f", outfit: "#5c6b7a", hairStyle: "short", extras: ["tie", "badge", "stubble"], age: 34 },
  AARAV: { skin: "#a8764f", hair: "#7a7a7e", outfit: "#33465a", hairStyle: "short", extras: ["tie", "badge", "glasses"], age: 46 },
  NEERAJ: { skin: "#a4764f", hair: "#1c1a1a", outfit: "#6a7a84", hairStyle: "short", extras: ["badge", "collar"], age: 38, trim: "#d9d9d2" },
  NURSE: { skin: "#b07f5b", hair: "#120f0f", outfit: "#d9dede", hairStyle: "bun", extras: ["whitecoat"], age: 32 },
};

const BROWS: Record<Mood, string> = {
  calm: "M-62 -678 Q-42 -690 -22 -680 M24 -680 Q44 -690 64 -678",
  worried: "M-62 -668 Q-42 -690 -20 -692 M22 -692 Q44 -690 64 -668",
  shock: "M-62 -690 Q-42 -706 -22 -694 M24 -694 Q44 -706 64 -690",
  sad: "M-62 -676 Q-40 -682 -20 -694 M20 -694 Q40 -682 62 -676",
  stern: "M-62 -690 Q-40 -680 -18 -672 M18 -672 Q40 -680 62 -690",
  tired: "M-62 -672 Q-42 -676 -22 -668 M24 -668 Q44 -676 64 -672",
  happy: "M-62 -684 Q-42 -698 -22 -688 M24 -688 Q44 -698 64 -684",
  resolute: "M-62 -684 Q-40 -682 -18 -676 M18 -676 Q40 -682 62 -684",
};
const MOUTHS: Record<Mood, string> = {
  calm: "M-26 -572 Q0 -566 26 -572",
  worried: "M-24 -566 Q0 -578 24 -566",
  shock: "M-14 -576 Q0 -556 14 -576 Q0 -590 -14 -576 Z",
  sad: "M-26 -562 Q0 -580 26 -562",
  stern: "M-28 -570 L28 -570",
  tired: "M-22 -568 Q0 -564 22 -570",
  happy: "M-32 -574 Q0 -544 32 -574",
  resolute: "M-26 -570 Q0 -562 28 -576",
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

/** Per-frame body language, from the action and the frame number. Everything is deterministic so renders repeat exactly. */
function motion(action: Action, f: number, seed: number) {
  const breathe = Math.sin(f / 22 + seed);
  let bodyY = breathe * 4, bodyScaleY = 1 + breathe * 0.006, headRot = Math.sin(f / 61 + seed) * 1.2, headY = 0, lean = 0, headX = 0;
  if (action === "walk") {
    const step = f * 0.36;
    bodyY = -Math.abs(Math.sin(step)) * 22;
    lean = 3 + Math.sin(step) * 1.6;
    headRot = -Math.sin(step) * 1.8;
    headY = Math.abs(Math.cos(step)) * 3;
  } else if (action === "slump") {
    bodyScaleY = 0.965 + breathe * 0.004;
    headRot = 7 + Math.sin(f / 70 + seed) * 1.2;
    headY = 6;
    headX = 8;
    lean = 2;
    bodyY = 10 + breathe * 3;
  } else if (action === "lookup") {
    headRot = -7 + Math.sin(f / 50 + seed) * 1;
    headY = -8;
  } else if (action === "nod") {
    headRot = 3 + Math.sin(f / 9) * 4;
    headY = Math.max(0, Math.sin(f / 9)) * 6;
  }
  // blink: about every 3.5 s, lasting 4 frames, offset per character
  const cycle = 105 + (Math.round(seed * 7) % 20);
  const phase = (f + Math.round(seed * 40)) % cycle;
  const blink = phase < 4 ? Math.abs(phase - 2) / 2 : 1; // 1 = open, 0 = closed
  return { bodyY, bodyScaleY, headRot, headY, headX, lean, blink };
}

export const Character: React.FC<{
  /** a built-in cast id, or any string when `look` is given (a character the user created) */
  id: string;
  /** the user's own character: used instead of the built-in LOOKS entry */
  look?: Look;
  x?: number;
  y?: number;
  scale?: number;
  flip?: boolean;
  /** 0 = face lit, 1 = almost a silhouette */
  shadow?: number;
  /** show a face, or only hair and shoulders (keeps identity, hides detail) */
  face?: boolean;
  mood?: Mood;
  /** body language: idle (breathing, blinking), walk, slump, lookup, nod */
  action?: Action;
  /** storybook look: no dark half-face, bigger sparkling eyes, blush, a gentle smile */
  friendly?: boolean;
}> = ({ id, look: lookProp, x = 540, y = 1850, scale: baseScale = 1.3, flip = false, shadow = 0.2, face = true, mood = "calm", action = "idle", friendly = false }) => {
  const look: Look = { trim: "#d9d9d2", ...(lookProp ?? LOOKS[id as CharacterId] ?? LOOKS.MEERA) };
  const scale = baseScale * (look.size ?? 1);
  const clip = "head" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const f = useCurrentFrame();
  const m = motion(action, f, id.length * 1.7 + look.age * 0.13);
  const has = (e: Look["extras"][number]) => look.extras.includes(e);
  const eyeRy = (mood === "shock" ? 12 : mood === "tired" ? 4.5 : mood === "happy" ? 6 : 7) * Math.max(0.12, m.blink);
  const headT = `translate(${m.headX} ${m.headY}) rotate(${m.headRot} 0 -480)`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${flip ? -m.lean : m.lean} 0 0) scale(${flip ? -scale : scale} ${scale})`} style={{ filter: `drop-shadow(-7px 0 0 ${C.amber}cc) brightness(${1 - shadow * 0.6})` }}>
      <g transform={`translate(0 ${m.bodyY}) scale(1 ${m.bodyScaleY})`}>
        <g transform={headT}><Hair look={look} back /></g>
        {has("hood") && <path d="M-215 -330 Q-200 -480 -110 -500 L110 -500 Q200 -480 215 -330 L120 -400 L-120 -400 Z" fill="#1f232c" />}
        {/* shoulders and torso */}
        <path d="M-285 0 L-272 -330 Q-250 -425 -130 -445 L130 -445 Q250 -425 272 -330 L285 0 Z" fill={look.outfit} />
        {has("collar") && (
          <g>
            <path d="M-70 -445 L0 -330 L70 -445 Z" fill={look.trim} />
            <path d="M-70 -445 L-150 -360 L-30 -300 L0 -330 Z M70 -445 L150 -360 L30 -300 L0 -330 Z" fill="#1b1b20" />
          </g>
        )}
        {has("tie") && (
          <g>
            <path d="M-70 -445 L0 -340 L70 -445 L40 -450 L0 -420 L-40 -450 Z" fill="#d9d9d2" />
            <path d="M-14 -400 L14 -400 L22 -300 L0 -150 L-22 -300 Z" fill="#7a2f33" />
            <path d="M-16 -420 L16 -420 L12 -392 L-12 -392 Z" fill="#5c2225" />
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
        {has("whitecoat") && <path d="M-60 -445 L-40 -120 L40 -120 L60 -445 L0 -330 Z" fill="#f1f1ec" opacity={0.9} />}
      </g>
      {/* neck and head: the head sways on its own, pivoting at the neck */}
      <g transform={`translate(0 ${m.bodyY * 0.6})`}>
        <g transform={headT}>
          <rect x={-38} y={-520} width={76} height={100} fill={look.skin} />
          <rect x={-38} y={-520} width={76} height={40} fill={C.ink} opacity={0.35} />
          <ellipse cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry} fill={look.skin} />
          <clipPath id={clip}><ellipse cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry} /></clipPath>
          <g clipPath={`url(#${clip})`}>
            <rect x={5} y={-800} width={130} height={320} fill={C.ink} opacity={friendly ? 0.1 : 0.4 + shadow * 0.35} />
            {has("beard") && <path d="M-105 -620 Q-100 -470 0 -455 Q100 -470 105 -620 Q60 -540 0 -535 Q-60 -540 -105 -620 Z" fill={look.hair} />}
            {has("stubble") && <path d="M-105 -600 Q-90 -500 0 -495 Q90 -500 105 -600 L100 -520 Q0 -440 -100 -520 Z" fill={C.ink} opacity={0.3} />}
          </g>
          {has("mustache") && <path d="M-46 -585 Q0 -610 46 -585 Q0 -595 -46 -585 Z" fill={look.hair} />}
          {face && (
            <g>
              <ellipse cx={-42} cy={-650} rx={friendly ? 17 : 14} ry={eyeRy * (friendly ? 1.5 : 1)} fill={C.ink} opacity={0.9} />
              <ellipse cx={44} cy={-650} rx={friendly ? 17 : 14} ry={eyeRy * (friendly ? 1.5 : 1)} fill={C.ink} opacity={friendly ? 0.9 : 0.7} />
              {friendly && m.blink > 0.6 && (
                <g fill="#fff" opacity={0.9}>
                  <circle cx={-36} cy={-657} r={5} /><circle cx={50} cy={-657} r={5} />
                </g>
              )}
              {friendly && <g fill="#e0706a" opacity={0.3}><ellipse cx={-72} cy={-596} rx={26} ry={15} /><ellipse cx={74} cy={-596} rx={26} ry={15} /></g>}
              {mood === "tired" && <path d="M-58 -626 Q-42 -616 -26 -626 M28 -626 Q44 -616 60 -626" stroke={C.ink} strokeWidth={4} fill="none" opacity={0.3} />}
              <path d={BROWS[mood]} stroke={look.hair === "#e8e6e0" ? "#cfcfc8" : C.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
              <path d="M-4 -640 Q-12 -600 4 -596" stroke={C.ink} strokeWidth={4} fill="none" opacity={0.35} />
              <path d={friendly && mood === "calm" ? "M-28 -574 Q0 -550 28 -574" : MOUTHS[mood]} stroke={C.ink} strokeWidth={5} fill={mood === "shock" ? C.ink : "none"} strokeLinecap="round" opacity={0.7} />
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
          {has("cap") && <path d="M-122 -690 Q-110 -810 0 -815 Q110 -810 122 -690 L150 -682 L-150 -682 Z" fill={look.outfit} stroke={C.ink} strokeWidth={3} />}
          {has("headphones") && (
            <g>
              <path d="M-118 -650 Q-125 -810 0 -815 Q125 -810 118 -650" stroke="#101216" strokeWidth={16} fill="none" />
              <rect x={-140} y={-690} width={36} height={86} rx={16} fill="#101216" />
              <rect x={104} y={-690} width={36} height={86} rx={16} fill="#101216" />
            </g>
          )}
        </g>
      </g>
    </g>
  );
};

export const CHARACTER_IDS = Object.keys(LOOKS) as CharacterId[];
