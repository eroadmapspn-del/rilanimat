import type { EpisodeStage } from "@/generated/prisma/client";

/**
 * The pipeline's rules, in one place and free of I/O so they are easy to test.
 *
 *   PLANNED -> SCRIPTING -> SCRIPT_READY -> (approve) SCRIPT_APPROVED -> VOICING -> VOICE_READY -> (approve) VOICE_APPROVED
 *           -> RENDERING -> DONE            any step can end in FAILED and be retried
 *
 * Gates are enforced on the server. Changing the spoken words resets everything after the script, because the voice-over
 * and the word timings no longer match.
 */
const ORDER: EpisodeStage[] = [
  "PLANNED", "SCRIPTING", "SCRIPT_READY", "SCRIPT_APPROVED", "VOICING", "VOICE_READY", "VOICE_APPROVED", "RENDERING", "DONE",
];

export const rank = (s: EpisodeStage) => (s === "FAILED" ? -1 : ORDER.indexOf(s));

/** A script can be (re)written until the user has moved on to rendering. Writing again discards the voice-over. */
export const canWriteScript = (s: EpisodeStage) => !["SCRIPTING", "VOICING", "RENDERING"].includes(s);

export const canEditScript = (s: EpisodeStage) => ["SCRIPT_READY", "SCRIPT_APPROVED", "VOICE_READY", "VOICE_APPROVED", "DONE"].includes(s);

export const canApproveScript = (s: EpisodeStage) => s === "SCRIPT_READY";

export const canMakeVoice = (s: EpisodeStage) => ["SCRIPT_APPROVED", "VOICE_READY", "VOICE_APPROVED", "FAILED"].includes(s);

export const canApproveVoice = (s: EpisodeStage) => s === "VOICE_READY";

export const canRender = (s: EpisodeStage) => s === "VOICE_APPROVED";

/** Stage a user lands on after the spoken text changes: they must re-read, re-approve and re-voice. */
export const afterTextChange: EpisodeStage = "SCRIPT_READY";

export const STAGE_LABEL: Record<EpisodeStage, string> = {
  PLANNED: "Planned",
  SCRIPTING: "Writing script…",
  SCRIPT_READY: "Script ready: review it",
  SCRIPT_APPROVED: "Script approved",
  VOICING: "Recording voice-over…",
  VOICE_READY: "Voice-over ready: listen and approve",
  VOICE_APPROVED: "Voice approved",
  RENDERING: "Rendering video…",
  DONE: "Video ready",
  FAILED: "Failed: try again",
};
