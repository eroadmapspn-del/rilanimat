import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { quotaFor } from "@/lib/plans";
import { CAMERAS, TRANSITIONS } from "@/lib/pipeline/catalog";
import { VOICES } from "@/lib/pipeline/voice";
import type { VoiceMeta } from "@/lib/pipeline/service";
import { canApproveScript, canApproveVoice, canEditScript, canMakeVoice, canRender, canWriteScript, STAGE_LABEL } from "@/lib/pipeline/workflow";
import type { EpisodeStory } from "@/lib/pipeline/scriptwriter";
import Workspace, { type EpisodeView, type PlanView } from "./workspace";

export const metadata: Metadata = { title: "Series" };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  // Always filter by the signed-in user: a project id from someone else simply 404s.
  const project = await db.project.findFirst({ where: { id, userId: user.id }, include: { episodes: { orderBy: { number: "asc" }, include: { renders: { orderBy: { createdAt: "desc" }, take: 1 } } } } });
  if (!project) notFound();

  const quota = await quotaFor(user);
  const plan: PlanView = {
    label: user.role === "ADMIN" ? "Admin" : quota.label,
    maxSeconds: quota.maxSeconds,
    videosLeft: quota.unlimited ? null : quota.left,
    videosTotal: quota.unlimited ? null : quota.videos,
    period: quota.period,
    customizeAnimation: quota.customizeAnimation,
    threeD: quota.threeD,
  };
  const bible = project.bible as { premise: string; tone: string; cast: { name: string; role: string }[] } | null;
  const views: EpisodeView[] = project.episodes.map((e) => {
    const o = e.outline as { summary: string; cliffhanger: string };
    const story = e.story as unknown as EpisodeStory | null;
    const voice = e.voice as VoiceMeta | null;
    return {
      number: e.number, title: e.title, stage: e.stage, stageLabel: STAGE_LABEL[e.stage], summary: o.summary, cliffhanger: o.cliffhanger,
      version: e.currentVersion,
      error: e.error, canWrite: canWriteScript(e.stage), canEdit: canEditScript(e.stage), canApprove: canApproveScript(e.stage),
      scenes: (story?.scenes ?? []).map((s) => ({
        text: s.text, role: s.role, location: s.visual.art.location, characters: s.visual.art.characters.map((c) => c.name), camera: s.visual.camera, transition: s.transition,
      })),
      hooks: ((story?.meta?.hooks as { type: string; line: string }[]) ?? []),
      words: (story?.scenes ?? []).reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0),
      canVoice: canMakeVoice(e.stage) && e.stage !== "FAILED", canApproveVoice: canApproveVoice(e.stage), canRender: canRender(e.stage),
      voice: voice ? { assetId: voice.assetId, seconds: voice.duration, timing: voice.timing, voiceName: voice.voiceName } : null,
      videoAssetId: e.renders[0]?.status === "DONE" ? e.renders[0].outputAssetId : null,
      progress: e.renders[0]?.progress ?? 0,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/app" className="text-sm text-muted hover:text-foreground">← Your studio</Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{project.title}</h1>
        {bible && (
          <div className="mt-2 flex flex-col gap-3">
            <p className="max-w-3xl text-muted">{bible.premise}</p>
            <ul className="flex flex-wrap gap-2" aria-label="Cast">
              {bible.cast.map((c) => (
                <li key={c.name} className="badge" title={c.role}>{c.name} · {c.role}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <Workspace projectId={project.id} language={project.language} episodes={views} plan={plan} voices={[...VOICES]} cameras={[...CAMERAS]} transitions={[...TRANSITIONS]} />
    </div>
  );
}
