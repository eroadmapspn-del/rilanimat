"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { WORDS_PER_SECOND, type Language } from "@/lib/pipeline/catalog";

export type EpisodeView = {
  number: number;
  title: string;
  stage: string;
  stageLabel: string;
  version: number;
  summary: string;
  cliffhanger: string;
  error: string | null;
  canWrite: boolean;
  canEdit: boolean;
  canApprove: boolean;
  canVoice: boolean;
  canApproveVoice: boolean;
  canRender: boolean;
  scenes: { text: string; role?: string; location: string; characters: string[]; camera: string; transition: string }[];
  hooks: { type: string; line: string }[];
  words: number;
  voice: { assetId: string; seconds: number; timing: string; voiceName: string } | null;
  videoAssetId: string | null;
  progress: number;
};

export type PlanView = {
  label: string;
  maxSeconds: number;
  videosLeft: number | null; // null = no limit
  videosTotal: number | null;
  period: "total" | "month";
  customizeAnimation: boolean;
  threeD: boolean;
};

const nice = (s: string) => s.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
const wordCount = (t: string) => t.split(/\s+/).filter(Boolean).length;

/** Which step an episode is on: 0 script, 1 voice-over, 2 video, 3 finished. */
function stepOf(ep: EpisodeView): number {
  if (ep.videoAssetId || ep.stage === "DONE") return 3;
  if (ep.canRender || ep.stage === "RENDERING") return 2;
  if (ep.voice || ep.canVoice || ep.canApproveVoice) return 1;
  return 0;
}

const STEP_NAMES = ["Script", "Voice-over", "Video"];

function Check({ ok }: { ok: boolean }) {
  return ok ? (
    <svg className="h-4 w-4 shrink-0 text-success" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z" clipRule="evenodd" /></svg>
  ) : (
    <span className="h-4 w-4 shrink-0 rounded-full border-2 border-border-strong" aria-hidden="true" />
  );
}

function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const over = value > max + 3;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className={over ? "font-semibold text-danger" : "font-semibold"}>{Math.round(value)}s / {max}s</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
        <div className={`h-full rounded-full ${over ? "bg-danger" : "bg-brand"}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

export default function Workspace({ projectId, language, episodes, plan, voices, cameras, transitions }: {
  projectId: string; language: string; episodes: EpisodeView[]; plan: PlanView; voices: string[]; cameras: string[]; transitions: string[];
}) {
  const [selected, setSelected] = useState(() => (episodes.find((e) => e.stage !== "DONE") ?? episodes[0])?.number ?? 1);
  const ep = episodes.find((e) => e.number === selected) ?? episodes[0];
  const left = plan.videosLeft;
  const pct = plan.videosTotal && left !== null ? Math.round(((plan.videosTotal - left) / plan.videosTotal) * 100) : 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
      <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24">
        <div className="card !p-4">
          <div className="flex items-center justify-between">
            <span className="badge">{plan.label}</span>
            <Link href="/app/billing" className="text-xs font-semibold text-brand hover:underline">Plans</Link>
          </div>
          <p className="mt-3 text-sm">
            <span className="text-2xl font-bold tracking-tight">{left === null ? "Unlimited" : left}</span>
            {left !== null && <span className="text-muted"> of {plan.videosTotal} videos left{plan.period === "month" ? " this month" : ""}</span>}
          </p>
          {left !== null && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Videos used">
              <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
            </div>
          )}
          <p className="mt-2 text-xs text-muted">Up to {plan.maxSeconds} seconds per video</p>
        </div>

        <nav aria-label="Episodes">
          <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted uppercase">Episodes</h2>
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {episodes.map((e) => {
              const step = stepOf(e);
              const active = e.number === ep.number;
              return (
                <li key={e.number} className="min-w-[13rem] lg:min-w-0">
                  <button
                    onClick={() => setSelected(e.number)}
                    aria-current={active ? "true" : undefined}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${active ? "border-brand bg-brand-soft" : "border-border bg-card hover:bg-subtle"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted">Episode {e.number}</span>
                      {step === 3 && <span className="text-xs font-semibold text-success">Done</span>}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-sm font-semibold">{e.title}</span>
                    <span className="mt-2 grid grid-cols-3 gap-1" aria-hidden="true">
                      {STEP_NAMES.map((n, i) => <span key={n} className={`h-1 rounded-full ${i < step ? "bg-success" : i === step ? "bg-brand" : "bg-border"}`} />)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {ep && (
        <EpisodeWorkspace
          key={`${ep.number}-${ep.stage}-${ep.version}-${ep.voice?.assetId ?? ""}`}
          projectId={projectId} language={language as Language} ep={ep} plan={plan} voices={voices} cameras={cameras} transitions={transitions}
        />
      )}
    </div>
  );
}

function EpisodeWorkspace({ projectId, language, ep, plan, voices, cameras, transitions }: {
  projectId: string; language: Language; ep: EpisodeView; plan: PlanView; voices: string[]; cameras: string[]; transitions: string[];
}) {
  const router = useRouter();
  const step = stepOf(ep);
  const [tab, setTab] = useState(Math.min(step, 2));
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [voiceName, setVoiceName] = useState(ep.voice?.voiceName ?? voices[0]);
  const [texts, setTexts] = useState(ep.scenes.map((s) => s.text));
  const [anim, setAnim] = useState(ep.scenes.map((s) => ({ camera: s.camera, transition: s.transition })));
  const [progress, setProgress] = useState(ep.progress);
  const base = `/api/projects/${projectId}/episodes/${ep.number}`;

  const textDirty = texts.some((t, i) => t !== ep.scenes[i]?.text);
  const animDirty = anim.some((a, i) => a.camera !== ep.scenes[i]?.camera || a.transition !== ep.scenes[i]?.transition);
  const dirty = textDirty || animDirty;
  const estSeconds = texts.reduce((n, t) => n + wordCount(t), 0) / WORDS_PER_SECOND[language];
  const scriptTooLong = estSeconds > plan.maxSeconds + 3;
  const voiceTooLong = ep.voice ? ep.voice.seconds > plan.maxSeconds + 3 : false;
  const voiceUnlocked = ep.canVoice || Boolean(ep.voice);
  const videoUnlocked = ep.canRender || ep.stage === "RENDERING" || Boolean(ep.videoAssetId);
  const outOfVideos = plan.videosLeft !== null && plan.videosLeft < 1;

  // While the worker renders, ask for progress every few seconds and refresh the page when it finishes.
  useEffect(() => {
    if (ep.stage !== "RENDERING") return;
    const timer = setInterval(async () => {
      const res = await fetch(`${base}/status`).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (!data) return;
      setProgress(data.render?.progress ?? 0);
      if (data.stage !== "RENDERING") router.refresh();
    }, 4000);
    return () => clearInterval(timer);
  }, [ep.stage, base, router]);

  async function call(label: string, url: string, init: RequestInit) {
    setBusy(label);
    setNote(null);
    const res = await fetch(url, init).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy("");
    if (!res || !res.ok) {
      setNote({ ok: false, text: data?.error ?? "Something went wrong. Please try again." });
      router.refresh();
      return;
    }
    if (label === "write") setNote({ ok: true, text: `Script written: ${data.words} words, about ${data.seconds} seconds.${data.warnings?.length ? ` ${data.warnings.length} note(s) to check.` : ""}` });
    if (label === "voice") setNote({ ok: true, text: `Voice-over recorded: ${Math.round(data.seconds)} seconds.` });
    if (label === "save") setNote({ ok: true, text: textDirty ? "Saved. Approve the script again, then record the voice-over." : "Animation saved." });
    router.refresh();
  }
  const post = (label: string, path: string, body?: unknown) =>
    call(label, `${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const save = () =>
    call("save", `${base}/script`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...(textDirty ? { texts } : {}), ...(animDirty ? { animation: anim } : {}) }),
    });
  const discard = () => { setTexts(ep.scenes.map((s) => s.text)); setAnim(ep.scenes.map((s) => ({ camera: s.camera, transition: s.transition }))); };

  const tabs = [
    { name: "Script", done: step > 0, locked: false },
    { name: "Voice-over", done: step > 1, locked: !voiceUnlocked },
    { name: "Video", done: step > 2, locked: !videoUnlocked },
  ];

  return (
    <section className="card !p-0 overflow-hidden" aria-labelledby={`ep-${ep.number}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5 sm:p-6">
        <div>
          <p className="eyebrow">Episode {ep.number}</p>
          <h2 id={`ep-${ep.number}`} className="mt-1 text-xl font-semibold tracking-tight">{ep.title}</h2>
        </div>
        <span className="badge">{ep.stageLabel}</span>
      </header>

      <div role="tablist" aria-label="Episode steps" className="grid grid-cols-3 border-b border-border bg-subtle">
        {tabs.map((t, i) => (
          <button
            key={t.name} role="tab" aria-selected={tab === i} disabled={t.locked} onClick={() => setTab(i)}
            className={`flex items-center justify-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${tab === i ? "border-brand bg-card text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
          >
            <Check ok={t.done} /> <span><span className="hidden sm:inline">{i + 1}. </span>{t.name}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-5 p-5 sm:p-6" role="tabpanel">
        {ep.error && <p role="alert" className="alert-error">{ep.error}</p>}

        {/* ------------------------------------------------ Script */}
        {tab === 0 && (
          <>
            <div className="rounded-xl bg-subtle p-4 text-sm">
              <p><span className="font-semibold">This episode:</span> <span className="text-muted">{ep.summary}</span></p>
              <p className="mt-1"><span className="font-semibold">Ends on:</span> <span className="text-muted">{ep.cliffhanger}</span></p>
            </div>

            {ep.scenes.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-strong py-12 text-center">
                <p className="font-semibold">No script yet</p>
                <p className="hint max-w-sm">The AI writes the narration scene by scene, with a hook at the start. You can edit every line before approving.</p>
                {ep.canWrite && (
                  <button className="btn-primary" disabled={Boolean(busy)} onClick={() => post("write", "/script")}>
                    {busy === "write" ? "Writing… (up to a minute)" : "Write the script"}
                  </button>
                )}
              </div>
            ) : (
              <>
                {ep.hooks.length > 0 && (
                  <details className="rounded-xl border border-border p-4 text-sm">
                    <summary className="cursor-pointer font-semibold">Opening hooks the AI considered</summary>
                    <ul className="mt-3 flex flex-col gap-2 text-muted">
                      {ep.hooks.map((h) => <li key={h.type}><span className="font-semibold capitalize text-foreground">{h.type}:</span> “{h.line}”</li>)}
                    </ul>
                  </details>
                )}

                {!plan.customizeAnimation && (
                  <p className="rounded-xl border border-border bg-brand-soft p-3 text-sm">
                    Camera moves and transitions are set automatically on the {plan.label} plan.{" "}
                    <Link href="/app/billing" className="font-semibold text-brand hover:underline">Upgrade to Pro</Link> to customise them for every scene.
                  </p>
                )}

                <ol className="flex flex-col gap-4">
                  {ep.scenes.map((s, i) => (
                    <li key={i} className="rounded-xl border border-border p-4">
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold">Scene {i + 1}</span>
                        {s.role && <span className="badge">{s.role === "cta" ? "Call to action" : "Recap"} · automatic</span>}
                        <span className="text-muted">{nice(s.location)}</span>
                        {s.characters.length > 0 && <span className="text-muted">· {s.characters.join(", ")}</span>}
                      </div>
                      <label htmlFor={`s-${ep.number}-${i}`} className="sr-only">Narration for scene {i + 1}</label>
                      <textarea
                        id={`s-${ep.number}-${i}`} value={texts[i] ?? ""} rows={3}
                        readOnly={!ep.canEdit || Boolean(s.role)}
                        onChange={(e) => setTexts((t) => t.map((x, k) => (k === i ? e.target.value : x)))}
                        className="input read-only:bg-subtle"
                      />
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
                        <span>{wordCount(texts[i] ?? "")} words · about {Math.round(wordCount(texts[i] ?? "") / WORDS_PER_SECOND[language])}s</span>
                        <span className="flex flex-wrap items-center gap-2">
                          {plan.customizeAnimation && ep.canEdit ? (
                            <>
                              <label className="flex items-center gap-1.5">Camera
                                <select value={anim[i]?.camera} onChange={(e) => setAnim((a) => a.map((x, k) => (k === i ? { ...x, camera: e.target.value } : x)))} className="input !w-auto !py-1 !text-xs">
                                  {cameras.map((c) => <option key={c} value={c}>{nice(c)}</option>)}
                                </select>
                              </label>
                              <label className="flex items-center gap-1.5">Transition
                                <select value={anim[i]?.transition} onChange={(e) => setAnim((a) => a.map((x, k) => (k === i ? { ...x, transition: e.target.value } : x)))} className="input !w-auto !py-1 !text-xs">
                                  {transitions.map((c) => <option key={c} value={c}>{nice(c)}</option>)}
                                </select>
                              </label>
                            </>
                          ) : (
                            <span>Camera: {nice(s.camera)} · Transition: {nice(s.transition)}</span>
                          )}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>

                <Meter value={estSeconds} max={plan.maxSeconds} label="Estimated length" />
                {scriptTooLong && (
                  <p role="alert" className="alert-error">
                    This script will run about {Math.round(estSeconds)} seconds, but the {plan.label} plan allows up to {plan.maxSeconds}. Shorten the text{" "}
                    {plan.label === "Free" || plan.label === "Pro" ? <>or <Link href="/app/billing" className="font-semibold underline">upgrade</Link></> : null}.
                  </p>
                )}
              </>
            )}

            {ep.scenes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {ep.canApprove && !dirty && (
                  <button className="btn-primary" disabled={Boolean(busy) || scriptTooLong} onClick={() => post("approve", "/approve")}>
                    {busy === "approve" ? "Approving…" : "Approve script and continue"}
                  </button>
                )}
                {ep.canWrite && (
                  <button className="btn-secondary" disabled={Boolean(busy)} onClick={() => post("write", "/script")}>
                    {busy === "write" ? "Writing… (up to a minute)" : "Rewrite with AI"}
                  </button>
                )}
                {ep.canEdit && !ep.canApprove && !dirty && step === 0 && <span className="hint">Script approved.</span>}
              </div>
            )}
          </>
        )}

        {/* ------------------------------------------------ Voice-over */}
        {tab === 1 && (
          <>
            {!voiceUnlocked ? (
              <p className="hint">Approve your script first. Then you can record the voice-over.</p>
            ) : (
              <>
                <fieldset disabled={!ep.canVoice || Boolean(busy)}>
                  <legend className="label">Narrator voice</legend>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {voices.map((v) => (
                      <button key={v} type="button" onClick={() => setVoiceName(v)} aria-pressed={voiceName === v}
                        className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${voiceName === v ? "border-brand bg-brand-soft text-brand" : "border-border-strong hover:bg-subtle"}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {ep.voice && (
                  <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
                    <audio controls src={`/api/assets/${ep.voice.assetId}`} className="w-full" />
                    <Meter value={ep.voice.seconds} max={plan.maxSeconds} label={`Voice ${ep.voice.voiceName}`} />
                    <p className="text-xs text-muted">Captions are timed to this recording ({ep.voice.timing === "measured" ? "measured from the audio" : "estimated"}).</p>
                    {voiceTooLong && <p role="alert" className="alert-error">This recording is longer than your plan allows ({plan.maxSeconds}s). Shorten the script, or upgrade.</p>}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {ep.canApproveVoice && !voiceTooLong && (
                    <button className="btn-primary" disabled={Boolean(busy)} onClick={() => post("approveVoice", "/voice/approve")}>Approve voice-over and continue</button>
                  )}
                  {ep.canVoice && (
                    <button className={ep.canApproveVoice ? "btn-secondary" : "btn-primary"} disabled={Boolean(busy)} onClick={() => post("voice", "/voice", { voice: voiceName })}>
                      {busy === "voice" ? "Recording… (up to a minute)" : ep.voice ? "Record again" : "Record voice-over"}
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ------------------------------------------------ Video */}
        {tab === 2 && (
          <>
            {!videoUnlocked ? (
              <p className="hint">Approve the voice-over first. Then you can render the video.</p>
            ) : (
              <>
                {ep.videoAssetId ? (
                  <div className="flex flex-col items-start gap-3">
                    <p className="alert-ok">Your video is ready.</p>
                    <video controls playsInline src={`/api/assets/${ep.videoAssetId}`} className="max-h-[70vh] w-full max-w-xs rounded-xl bg-black" />
                    <a href={`/api/assets/${ep.videoAssetId}?download=1`} className="btn-primary">Download MP4</a>
                  </div>
                ) : null}

                {ep.stage === "RENDERING" && (
                  <div role="status" className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between text-sm font-semibold"><span>Rendering your video</span><span>{progress}%</span></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.max(3, progress)}%` }} /></div>
                    <p className="mt-2 text-xs text-muted">This takes a few minutes. You can leave this page; the video will be here when it is done.</p>
                  </div>
                )}

                {ep.canRender && (
                  <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
                    <h3 className="font-semibold">{ep.videoAssetId ? "Render a new version" : "Ready to render"}</h3>
                    <ul className="flex flex-col gap-2 text-sm">
                      <li className="flex items-center gap-2"><Check ok /> Script approved ({ep.scenes.length} scenes)</li>
                      <li className="flex items-center gap-2"><Check ok /> Voice-over approved ({ep.voice ? Math.round(ep.voice.seconds) : 0}s, voice {ep.voice?.voiceName})</li>
                      <li className="flex items-center gap-2"><Check ok={!voiceTooLong} /> Within your plan&apos;s {plan.maxSeconds}s limit</li>
                      <li className="flex items-center gap-2"><Check ok={!outOfVideos} /> {plan.videosLeft === null ? "No video limit" : `${plan.videosLeft} video${plan.videosLeft === 1 ? "" : "s"} left on your plan`}</li>
                      <li className="flex items-center gap-2 text-muted"><Check ok /> 2D animation{plan.threeD ? " (3D is coming soon to Studio)" : ""}</li>
                    </ul>
                    <div className="flex flex-wrap items-center gap-3">
                      <button className="btn-primary btn-lg" disabled={Boolean(busy) || outOfVideos || voiceTooLong} onClick={() => post("render", "/render")}>
                        {busy === "render" ? "Starting…" : "Render video (uses 1 video)"}
                      </button>
                      {outOfVideos && <Link href="/app/billing" className="btn-secondary">Upgrade for more videos</Link>}
                    </div>
                    <p className="text-xs text-muted">A render that fails does not count against your videos.</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {note && (
          <p role={note.ok ? "status" : "alert"} className={note.ok ? "alert-ok" : "alert-error"}>
            {note.text} {!note.ok && /plan|upgrade|used all|Pro and Studio/i.test(note.text) && <Link href="/app/billing" className="font-semibold underline">See plans</Link>}
          </p>
        )}
      </div>

      {dirty && tab === 0 && (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card/95 p-4 backdrop-blur sm:px-6" role="region" aria-label="Unsaved changes">
          <p className="text-sm">
            <span className="font-semibold">Unsaved changes.</span>{" "}
            <span className="text-muted">{textDirty ? "New words mean you will approve the script and record the voice-over again." : "Your voice-over stays as it is."}</span>
          </p>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={discard} disabled={Boolean(busy)}>Discard</button>
            <button className="btn-primary" onClick={save} disabled={Boolean(busy)}>{busy === "save" ? "Saving…" : "Save changes"}</button>
          </div>
        </div>
      )}
    </section>
  );
}
