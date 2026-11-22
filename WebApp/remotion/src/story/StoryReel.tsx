import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from "remotion";
import { CinematicScene } from "./CinematicScene";
import { WordCaptions, groupWords } from "./WordCaptions";
import type { StoryProps, TimedWord } from "./types";

const frames = (seconds: number, fps: number) => Math.max(1, Math.round(seconds * fps));

/** 0..1 music gain: 0 while someone is speaking (looks +-0.3s around now, smoothed), 1 in pauses. */
export function duckFactor(words: TimedWord[], t: number): number {
  const taps = 7;
  let sum = 0;
  for (let k = 0; k < taps; k++) {
    const x = t - 0.3 + (0.6 * k) / (taps - 1);
    sum += words.some((w) => x >= w.start - 0.05 && x <= w.end + 0.2) ? 0 : 1;
  }
  return sum / taps;
}

export const StoryReel: React.FC<StoryProps> = (props) => {
  const { fps, scenes, words, voice, music, sfx, theme, safe, transitionSeconds, durationSeconds, showCaptions } = props;
  const tf = frames(transitionSeconds, fps);
  const groups = useMemo(() => groupWords(words), [words]);
  const total = frames(durationSeconds, fps);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {scenes.map((scene, i) => {
        const start = Math.round(scene.start * fps);
        const lead = i === 0 ? 0 : Math.min(tf, start);
        const from = start - lead;
        const to = i === scenes.length - 1 ? total : Math.round(scene.end * fps);
        return (
          <Sequence key={scene.id} from={from} durationInFrames={Math.max(1, to - from)}>
            <CinematicScene scene={scene} theme={theme} transitionFrames={lead || 1} isFirst={i === 0} />
          </Sequence>
        );
      })}

      {showCaptions ? <WordCaptions groups={groups} theme={theme} bottom={safe.bottom} side={safe.side} /> : null}

      {voice ? <Audio src={staticFile(voice)} /> : null}
      {music ? (
        <Audio
          src={staticFile(music.file)}
          loop
          volume={(f) => {
            const t = f / fps;
            const fadeIn = interpolate(t, [0, 1.2], [0, 1], { extrapolateRight: "clamp" });
            const fadeOut = interpolate(t, [durationSeconds - 1.8, durationSeconds], [1, 0], { extrapolateLeft: "clamp" });
            const level = music.duckTo + (music.volume - music.duckTo) * duckFactor(words, t);
            return Math.max(0, level * Math.min(fadeIn, fadeOut));
          }}
        />
      ) : null}
      {sfx.map((s, i) => (
        <Sequence key={i} from={Math.round(s.at * fps)}>
          <Audio src={staticFile(s.file)} volume={s.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
