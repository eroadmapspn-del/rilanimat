import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { db } from "./src/lib/db";
import { quotaFor } from "./src/lib/plans";
import { alignByPauses, durationOf, parseWav } from "./src/lib/pipeline/audio";
import { buildProps } from "./src/lib/pipeline/timeline";
import { requestRender } from "./src/lib/pipeline/service";
import { saveAsset, readAsset } from "./src/lib/storage";
import { processNext } from "./worker/render-job";

const out = JSON.parse(readFileSync("C:/Users/pahwa/AppData/Local/Temp/claude/9999d7416f75f6d1/c445d43b-fc4f-4b37-807b-686077f629bc/scratchpad/live-test-out.json", "utf8"));
const planCast = out.plan.cast;
const story = JSON.parse(JSON.stringify(out.episodes[0].story));
const wavBuf = readFileSync("C:/Users/pahwa/AppData/Local/Temp/claude/9999d7416f75f6d1/c445d43b-fc4f-4b37-807b-686077f629bc/scratchpad/ep1-voice.wav");
const wav = parseWav(wavBuf);
const tokens = story.scenes.map((s: any) => s.text.trim()).join(" ").split(/\s+/).filter(Boolean);
const words = alignByPauses(tokens, wav)!;

const u = await db.user.create({ data: { email: "e2e-" + Date.now() + "@example.test" } });
try {
  const chars = await Promise.all(planCast.map((c: any, i: number) => db.character.create({ data: { userId: u.id, name: c.name, description: c.description, look: c.look } }).then((r) => [`c${i}`, r.id] as const)));
  const idMap = Object.fromEntries(chars);
  for (const s of story.scenes) for (const c of s.visual.art.characters) c.id = idMap[c.id] ?? c.id;
  const project = await db.project.create({ data: { userId: u.id, title: "e2e", prompt: "e2e", language: "Hindi", episodeCount: 3, bible: { tone: "friendly adventure", seconds: 55 } } });
  const mk = async (n: number, voiceAssetId: string) => {
    const ep = await db.episode.create({ data: { projectId: project.id, userId: u.id, number: n, title: "e2e " + n, outline: {}, stage: "VOICE_APPROVED", story, currentVersion: 1,
      voice: { provider: "gemini", voiceName: "Kore", duration: durationOf(wav), timing: "pause-aligned", words, notes: [], assetId: voiceAssetId } } });
    await db.episodeVersion.create({ data: { episodeId: ep.id, number: 1, story } });
    return ep;
  };
  const asset = await saveAsset({ userId: u.id, projectId: project.id, kind: "AUDIO", mime: "audio/wav", data: wavBuf });
  await mk(1, asset.id); await mk(2, "does-not-exist");
  console.log("credits before:", await quotaFor(u).then((q) => q.left));
  const j1 = await requestRender(u.id, project.id, 1); const j2 = await requestRender(u.id, project.id, 2);
  console.log("credits after 2 requests:", await quotaFor(u).then((q) => q.left), "| double request blocked:", await requestRender(u.id, project.id, 1).then(() => "NO (bad)", (e) => e.message));

  await ensureBrowser();
  const t0 = Date.now();
  while (await processNext((m) => console.log("  worker:", m))) {}
  console.log("worker finished in", ((Date.now() - t0) / 1000).toFixed(0) + "s");
  for (const j of [j1, j2]) {
    const job = await db.renderJob.findUniqueOrThrow({ where: { id: j.jobId } });
    console.log("job", job.status, job.progress + "%", job.error ?? "", "asset:", job.outputAssetId ? "yes" : "no");
  }
  console.log("videos left at end (expect 2 = FREE 3 - 1 good render; the failed one does not count):", await quotaFor(u).then((q) => q.left));
  const eps = await db.episode.findMany({ where: { projectId: project.id }, orderBy: { number: "asc" } });
  console.log("episode stages:", eps.map((e) => e.stage + (e.error ? " (" + e.error.slice(0, 50) + ")" : "")).join(" | "));
  const vid = await db.asset.findFirst({ where: { userId: u.id, kind: "VIDEO" } });
  if (vid) { const b = await readAsset(vid.key); writeFileSync("C:/Users/pahwa/AppData/Local/Temp/claude/9999d7416f75f6d1/c445d43b-fc4f-4b37-807b-686077f629bc/scratchpad/ep1-render.mp4", b); console.log("mp4 bytes:", b.length, "header:", b.subarray(4, 12).toString("ascii")); }

  // a few still frames to look at
  const props: any = buildProps({ story, voice: { words, duration: durationOf(wav) }, voiceFile: "voice.wav", looks: new Map(await db.character.findMany({ where: { userId: u.id } }).then((r) => r.map((c) => [c.id, c.look as any]))), tone: "friendly" });
  const serveUrl = await bundle({ entryPoint: path.resolve("remotion/src/index.ts") });
  const comp = await selectComposition({ serveUrl, id: "Story", inputProps: props });
  for (const sec of [1.2, 14, 40]) {
    await renderStill({ composition: comp, serveUrl, output: "C:/Users/pahwa/AppData/Local/Temp/claude/9999d7416f75f6d1/c445d43b-fc4f-4b37-807b-686077f629bc/scratchpad/frame-" + sec + ".png", frame: Math.round(sec * 30), inputProps: props, scale: 0.5 });
  }
  console.log("stills written");
} finally {
  await db.renderJob.deleteMany({ where: { userId: u.id } });
  await db.project.deleteMany({ where: { userId: u.id } }); await db.character.deleteMany({ where: { userId: u.id } });
  await db.asset.deleteMany({ where: { userId: u.id } }); await db.creditLedger.deleteMany({ where: { userId: u.id } });
  await db.user.delete({ where: { id: u.id } }); await db.$disconnect();
}
