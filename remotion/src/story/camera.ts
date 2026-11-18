import { Easing, interpolate } from "remotion";
import type { CameraMove } from "./types";

/** Camera transform for a still or video as progress t (0..1) moves through the scene. Slow and restrained on purpose. */
export function cameraTransform(move: CameraMove, t: number): string {
  const e = Easing.inOut(Easing.sin)(Math.min(1, Math.max(0, t)));
  switch (move) {
    case "push-in":
      return `scale(${interpolate(e, [0, 1], [1.06, 1.2])})`;
    case "pull-out":
      return `scale(${interpolate(e, [0, 1], [1.22, 1.07])})`;
    case "pan-left":
      return `translateX(${interpolate(e, [0, 1], [45, -45])}px) scale(1.14)`;
    case "pan-right":
      return `translateX(${interpolate(e, [0, 1], [-45, 45])}px) scale(1.14)`;
    case "tilt-up":
      return `translateY(${interpolate(e, [0, 1], [50, -50])}px) scale(1.14)`;
    case "tilt-down":
      return `translateY(${interpolate(e, [0, 1], [-50, 50])}px) scale(1.14)`;
    case "drift":
      return `translate(${interpolate(e, [0, 1], [-20, 20])}px, ${interpolate(e, [0, 1], [10, -10])}px) scale(1.1)`;
    default:
      return "scale(1.02)";
  }
}
