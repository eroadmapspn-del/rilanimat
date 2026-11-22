import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { entitlements } from "@/lib/plans";
import { deleteAsset, saveAsset } from "@/lib/storage";
import { lookSchema } from "@/lib/look";
import { Prisma } from "@/generated/prisma/client";
import { CAMERAS, TRANSITIONS, type Language } from "./catalog";
import { planSeries, writeEpisode, type EpisodeStory } from "./scriptwriter";
import { pollSchema, type CastMember, type Plan, type Poll } from "./types";
import { DEFAULT_VOICE, QuotaError, VOICES, makeVoice, type VoiceResult } from "./voice";
import { afterTextChange, canApproveScript, canApproveVoice, canEditScript, canMakeVoice, canRender, canWriteScript } from "./workflow";

export class PipelineError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

const MAX_PROJECTS = 25;

/** Neon can drop an idle connection while we wait on Gemini. The script is already paid for, so retry the save a few times. */
async function retryDb<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise((r) => setTimeout(r, 800 * i));
    }
  }
}
const json = (v: unknown) => v as Prisma.InputJsonValue;

type BibleCast = Plan["cast"][number];
type Bible = Pick<Plan, "title" | "premise" | "tone" | "visualStyle" | "arc"> & { cast: Pick<BibleCast, "name" | "role" | "description">[] };

/** Plan a series with Gemini, save new characters to the user's cast, and create one Episode row per outline. */
export async function createSeries(userId: string, input: { prompt: string; language: Language; episodes: number; seconds: number }) {
  const ent = entitlements(await db.user.findUniqueOrThrow({ where: { id: userId } }));
  if (input.seconds > ent.maxSeconds)
    throw new PipelineError(`The ${ent.label} plan allows videos of up to ${ent.maxSeconds} seconds. Choose a shorter length or upgrade.`, 402);
  if ((await db.project.count({ where: { userId, archivedAt: null } })) >= MAX_PROJECTS)
    throw new PipelineError("You have reached the project limit. Archive an old project first.", 409);

  const saved = await db.character.findMany({ where: { userId }, select: { name: true, description: true } });
  const plan = await planSeries({ prompt: input.prompt, language: input.language, episodes: input.episodes, savedCast: saved });

  // New characters are saved to the buyer's cast so they look the same in every later project. Names are unique per user.
  for (const c of plan.cast.filter((c) => !c.existing && c.look)) {
    const look = lookSchema.safeParse(c.look);
    if (!look.success) continue;
    await db.character.upsert({
      where: { userId_name: { userId, name: c.name } },
      update: {},
      create: { userId, name: c.name, description: c.description, look: look.data },
    });
  }

  const bible: Bible = {
    title: plan.title, premise: plan.premise, tone: plan.tone, visualStyle: plan.visualStyle, arc: plan.arc,
    cast: plan.cast.map(({ name, role, description }) => ({ name, role, description })),
  };
  const project = await db.project.create({
    data: {
      userId, title: plan.title, prompt: input.prompt, language: input.language, episodeCount: input.episodes, bible: json({ ...bible, seconds: input.seconds }),
      episodes: {
        create: plan.episodes.map((e) => ({
          userId, number: e.number, title: e.title,
          outline: json({ summary: e.summary, cliffhanger: e.cliffhanger, poll: e.poll }),
        })),
      },
    },
    include: { episodes: { orderBy: { number: "asc" } } },
  });
  return project;
}

async function loadEpisode(userId: string, projectId: string, number: number) {
  // Scoped by userId: another user's id simply finds nothing.
  const ep = await db.episode.findFirst({ where: { projectId, number, userId }, include: { project: true } });
  if (!ep) throw new PipelineError("Episode not found.", 404);
  return ep;
}

const outlineOf = (o: unknown) => o as { summary: string; cliffhanger: string; poll: Poll };

export async function generateScript(userId: string, projectId: string, number: number) {
  const ep = await loadEpisode(userId, projectId, number);
  const stuck = ep.stage === "SCRIPTING" && Date.now() - ep.updatedAt.getTime() > 5 * 60_000; // a crashed write must not lock the episode
  if (!canWriteScript(ep.stage) && !stuck) throw new PipelineError("This episode is busy. Wait for the current step to finish.", 409);

  // Claim the episode atomically so two clicks cannot start two Gemini calls.
  const claimed = await db.episode.updateMany({ where: { id: ep.id, stage: ep.stage }, data: { stage: "SCRIPTING", error: null } });
  if (claimed.count === 0) throw new PipelineError("This episode is already being written.", 409);

  try {
    const bible = ep.project.bible as (Bible & { seconds?: number }) | null;
    if (!bible) throw new PipelineError("The series plan is missing.", 500);
    const all = await db.episode.findMany({ where: { projectId }, orderBy: { number: "asc" } });
    const characters = await db.character.findMany({ where: { userId, name: { in: bible.cast.map((c) => c.name) } } });
    const cast: CastMember[] = characters.map((c) => ({
      id: c.id, name: c.name, description: c.description, look: lookSchema.safeParse(c.look).data ?? null,
    }));
    if (!cast.length) throw new PipelineError("No characters found for this series.", 500);

    const o = outlineOf(ep.outline);
    const result = await writeEpisode({
      userPrompt: ep.project.prompt,
      language: ep.project.language as Language,
      targetSeconds: bible.seconds ?? 55,
      plan: bible,
      episode: { number: ep.number, title: ep.title, summary: o.summary, cliffhanger: o.cliffhanger, poll: pollSchema.parse(o.poll) },
      totalEpisodes: ep.project.episodeCount,
      cast,
      previous: all.filter((e) => e.number < ep.number).map((e) => ({
        number: e.number, title: e.title, summary: outlineOf(e.outline).summary, poll: pollSchema.safeParse(outlineOf(e.outline).poll).data ?? null,
      })),
    });

    const number2 = ep.currentVersion + 1;
    await retryDb(() =>
      db.$transaction([
        db.episodeVersion.upsert({
          where: { episodeId_number: { episodeId: ep.id, number: number2 } },
          update: {},
          create: { episodeId: ep.id, number: number2, story: json(result.story), note: "Written by Gemini" },
        }),
        db.episode.update({
          where: { id: ep.id },
          data: { stage: "SCRIPT_READY", story: json(result.story), title: String(result.story.meta.title), currentVersion: number2, voice: Prisma.DbNull, error: null },
        }),
      ]),
    );
    return { ...result, version: number2 };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Script writing failed.";
    await retryDb(() => db.episode.update({ where: { id: ep.id }, data: { stage: "FAILED", error: message.slice(0, 500) } })).catch(() => undefined);
    throw e instanceof PipelineError ? e : new PipelineError(message, 502);
  }
}

/** The user changed the spoken words and/or the animation (camera move and transition per scene).
 *  - New words reset everything after the script, because the voice-over and its timings no longer match.
 *  - Animation changes never touch the voice-over. They are a paid feature (Pro and Studio), checked here on the server. */
export async function editScript(
  userId: string, projectId: string, number: number,
  input: { texts?: string[]; animation?: { camera: string; transition: string }[] },
) {
  const ep = await loadEpisode(userId, projectId, number);
  if (!canEditScript(ep.stage)) throw new PipelineError("There is no script to edit yet.", 409);
  const story = ep.story as unknown as EpisodeStory;
  const count = story.scenes.length;

  let clean: string[] | null = null;
  if (input.texts) {
    if (input.texts.length !== count) throw new PipelineError("The number of scenes cannot change here.");
    clean = input.texts.map((t) => t.replace(/\s+/g, " ").trim());
    if (clean.some((t) => !t || t.length > 700)) throw new PipelineError("Every scene needs text of up to 700 characters.");
  }
  if (input.animation) {
    const ent = entitlements(await db.user.findUniqueOrThrow({ where: { id: userId } }));
    if (!ent.customizeAnimation) throw new PipelineError("Customising the animation is available on the Pro and Studio plans.", 402);
    if (input.animation.length !== count) throw new PipelineError("The number of scenes cannot change here.");
    if (input.animation.some((a) => !CAMERAS.includes(a.camera as never) || !TRANSITIONS.includes(a.transition as never)))
      throw new PipelineError("That camera move or transition is not available.");
  }

  const next: EpisodeStory = {
    ...story,
    scenes: story.scenes.map((s, i) => ({
      ...s,
      text: clean ? clean[i] : s.text,
      transition: input.animation ? input.animation[i].transition : s.transition,
      visual: input.animation ? { ...s.visual, camera: input.animation[i].camera } : s.visual,
    })),
  };
  const textsChanged = clean ? clean.some((t, i) => t !== story.scenes[i].text) : false;
  const n = ep.currentVersion + 1;
  // New words: back to "review". Animation only: the voice stays; a finished video goes back to "ready to render".
  const stage = textsChanged ? afterTextChange : ep.stage === "DONE" ? "VOICE_APPROVED" : ep.stage;
  await db.$transaction([
    db.episodeVersion.create({ data: { episodeId: ep.id, number: n, story: json(next), note: textsChanged ? "Edited by you" : "Animation changed by you" } }),
    db.episode.update({
      where: { id: ep.id },
      data: { stage, story: json(next), currentVersion: n, ...(textsChanged ? { voice: Prisma.DbNull } : {}) },
    }),
  ]);
}

export async function approveScript(userId: string, projectId: string, number: number) {
  const ep = await loadEpisode(userId, projectId, number);
  if (!canApproveScript(ep.stage)) throw new PipelineError("There is no script waiting for approval.", 409);
  await db.episode.update({ where: { id: ep.id }, data: { stage: "SCRIPT_APPROVED" } });
}

// ---------------------------------------------------------------------------------------------------------------------
// Voice-over

export type VoiceMeta = VoiceResult & { assetId: string };

export async function generateVoice(userId: string, projectId: string, number: number, voiceName?: string) {
  const ep = await loadEpisode(userId, projectId, number);
  if (!canMakeVoice(ep.stage)) throw new PipelineError("Approve the script before recording the voice-over.", 409);
  if (!ep.story) throw new PipelineError("There is no script yet.", 409);
  const voice = VOICES.includes(voiceName as (typeof VOICES)[number]) ? voiceName! : DEFAULT_VOICE;

  const claimed = await db.episode.updateMany({ where: { id: ep.id, stage: ep.stage }, data: { stage: "VOICING", error: null } });
  if (claimed.count === 0) throw new PipelineError("The voice-over is already being recorded.", 409);
  const previous = ep.voice as VoiceMeta | null;
  try {
    const { wav, info } = await makeVoice(ep.story as unknown as EpisodeStory, voice, ep.project.language);
    const asset = await retryDb(() => saveAsset({ userId, projectId, kind: "AUDIO", mime: "audio/wav", data: wav }));
    const meta: VoiceMeta = { ...info, assetId: asset.id };
    await retryDb(() => db.episode.update({ where: { id: ep.id }, data: { stage: "VOICE_READY", voice: json(meta), error: null } }));
    if (previous?.assetId) { // the old recording is replaced: remove its file
      const old = await db.asset.findFirst({ where: { id: previous.assetId, userId } });
      if (old) { await deleteAsset(old.key).catch(() => undefined); await db.asset.delete({ where: { id: old.id } }).catch(() => undefined); }
    }
    return meta;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Voice-over failed.";
    // Back to "script approved" so the user can simply try again.
    await retryDb(() => db.episode.update({ where: { id: ep.id }, data: { stage: previous ? "VOICE_READY" : "SCRIPT_APPROVED", error: message.slice(0, 500) } })).catch(() => undefined);
    throw e instanceof PipelineError ? e : new PipelineError(message, e instanceof QuotaError ? 429 : 502);
  }
}

export async function approveVoice(userId: string, projectId: string, number: number) {
  const ep = await loadEpisode(userId, projectId, number);
  if (!canApproveVoice(ep.stage)) throw new PipelineError("There is no voice-over waiting for approval.", 409);
  await db.episode.update({ where: { id: ep.id }, data: { stage: "VOICE_APPROVED" } });
}

// ---------------------------------------------------------------------------------------------------------------------
// Render

/** Queue a render if the plan's video cap and length limit allow it. The user row is locked while the cap is checked, so two
 *  clicks at once cannot both squeeze under the limit. A render that fails stops counting, so nothing needs refunding. */
export async function requestRender(userId: string, projectId: string, number: number) {
  const ep = await loadEpisode(userId, projectId, number);
  if (!canRender(ep.stage)) throw new PipelineError("Approve the voice-over before rendering.", 409);
  const claimed = await db.episode.updateMany({ where: { id: ep.id, stage: "VOICE_APPROVED" }, data: { stage: "RENDERING", error: null } });
  if (claimed.count === 0) throw new PipelineError("This episode is already rendering.", 409);

  const jobId = randomUUID();
  try {
    const version = await db.episodeVersion.findUniqueOrThrow({ where: { episodeId_number: { episodeId: ep.id, number: ep.currentVersion } } });
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const ent = entitlements(user);
      const seconds = (ep.voice as { duration?: number } | null)?.duration ?? 0;
      if (seconds > ent.maxSeconds + 3)
        throw new PipelineError(`This video is ${Math.round(seconds)} seconds. The ${ent.label} plan allows up to ${ent.maxSeconds}. Shorten the script or upgrade.`, 402);
      if (!ent.unlimited) {
        const used = await tx.renderJob.count({ where: { userId, status: { in: ["QUEUED", "RUNNING", "DONE"] }, ...(ent.countFrom ? { createdAt: { gte: ent.countFrom } } : {}) } });
        if (used >= ent.videos)
          throw new PipelineError(`You have used all ${ent.videos} videos on the ${ent.label} plan${ent.period === "month" ? " for this month" : ""}. Upgrade to make more.`, 402);
      }
      await tx.renderJob.create({ data: { id: jobId, userId, projectId, episodeId: ep.id, versionId: version.id } });
    });
    return { jobId };
  } catch (e) {
    await db.episode.update({ where: { id: ep.id }, data: { stage: "VOICE_APPROVED" } }).catch(() => undefined);
    throw e;
  }
}
