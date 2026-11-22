import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { db } from "@/lib/db";
import { lookSchema, type Look } from "@/lib/look";
import type { EpisodeStory } from "@/lib/pipeline/scriptwriter";
import type { VoiceMeta } from "@/lib/pipeline/service";
import { buildProps } from "@/lib/pipeline/timeline";
import { readAsset, saveAsset } from "@/lib/storage";

const ENTRY = path.resolve("remotion/src/index.ts");
const SCALE = Number(process.env.RENDER_SCALE ?? 1); // 0.5 gives a quick low-resolution preview while developing

/** Take the oldest queued job. SKIP LOCKED lets several workers run side by side without ever taking the same job. */
export async function claimNext(): Promise<string | null> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    UPDATE "RenderJob" SET status = 'RUNNING', "startedAt" = now()
    WHERE id = (SELECT id FROM "RenderJob" WHERE status = 'QUEUED' ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING id`;
  return rows[0]?.id ?? null;
}

/** Jobs left RUNNING by a crashed worker are failed and their credit refunded. */
export async function recoverStale(minutes = 30) {
  const stale = await db.renderJob.findMany({ where: { status: "RUNNING", startedAt: { lt: new Date(Date.now() - minutes * 60_000) } } });
  for (const j of stale) await fail(j.id, "The render was interrupted. It does not count against your videos.");
}

async function fail(jobId: string, message: string) {
  const job = await db.renderJob.findUnique({ where: { id: jobId } });
  if (!job || job.status === "FAILED" || job.status === "DONE") return;
  await db.renderJob.update({ where: { id: jobId }, data: { status: "FAILED", error: message.slice(0, 500), finishedAt: new Date() } });
  // A FAILED job stops counting against the plan's video cap, so there is nothing to refund.
  await db.episode.update({ where: { id: job.episodeId }, data: { stage: "VOICE_APPROVED", error: `Render failed: ${message.slice(0, 300)}` } });
}

export async function processJob(jobId: string, log: (m: string) => void = console.log) {
  const work = path.join(os.tmpdir(), "reelstudio", jobId);
  try {
    const job = await db.renderJob.findUniqueOrThrow({ where: { id: jobId }, include: { version: true, episode: { include: { project: true } } } });
    const story = job.version.story as unknown as EpisodeStory;
    const voice = job.episode.voice as VoiceMeta | null;
    if (!voice?.assetId) throw new Error("There is no voice-over for this episode.");
    const voiceAsset = await db.asset.findFirst({ where: { id: voice.assetId, userId: job.userId } });
    if (!voiceAsset) throw new Error("The voice-over file is missing.");

    // The user's own characters, by id, so every video draws them exactly as saved.
    const ids = [...new Set(story.scenes.flatMap((s) => s.visual.art.characters.map((c) => c.id)))];
    const rows = await db.character.findMany({ where: { userId: job.userId, id: { in: ids } } });
    const looks = new Map<string, Look>();
    for (const r of rows) { const l = lookSchema.safeParse(r.look); if (l.success) looks.set(r.id, l.data); }

    const bible = job.episode.project.bible as { tone?: string } | null;
    const props = buildProps({ story, voice, voiceFile: "voice.wav", looks, tone: bible?.tone ?? "" });

    const publicDir = path.join(work, "public");
    await mkdir(publicDir, { recursive: true });
    await writeFile(path.join(publicDir, "voice.wav"), await readAsset(voiceAsset.key));

    log(`[${jobId.slice(0, 8)}] bundling…`);
    const serveUrl = await bundle({ entryPoint: ENTRY, publicDir });
    const inputProps = props as unknown as Record<string, unknown>;
    const composition = await selectComposition({ serveUrl, id: "Story", inputProps });
    const out = path.join(work, "out.mp4");
    let lastSaved = -10;
    log(`[${jobId.slice(0, 8)}] rendering ${composition.durationInFrames} frames at scale ${SCALE}…`);
    await renderMedia({
      composition, serveUrl, codec: "h264", crf: 20, outputLocation: out, inputProps, scale: SCALE, overwrite: true,
      onProgress: ({ progress }) => {
        const pct = Math.floor(progress * 100);
        if (pct - lastSaved >= 5) { lastSaved = pct; void db.renderJob.update({ where: { id: jobId }, data: { progress: pct } }).catch(() => undefined); }
      },
    });

    const video = await saveAsset({ userId: job.userId, projectId: job.projectId, kind: "VIDEO", mime: "video/mp4", data: await readFile(out) });
    await db.$transaction([
      db.renderJob.update({ where: { id: jobId }, data: { status: "DONE", progress: 100, outputAssetId: video.id, finishedAt: new Date() } }),
      db.episode.update({ where: { id: job.episodeId }, data: { stage: "DONE", error: null } }),
    ]);
    log(`[${jobId.slice(0, 8)}] done: ${(video.bytes / 1e6).toFixed(1)} MB`);
    return video;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log(`[${jobId.slice(0, 8)}] FAILED: ${message}`);
    await fail(jobId, message);
    return null;
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function processNext(log?: (m: string) => void) {
  const id = await claimNext();
  if (!id) return false;
  await processJob(id, log);
  return true;
}
