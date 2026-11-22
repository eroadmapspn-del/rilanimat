import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { quotaFor } from "@/lib/plans";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Your studio" };

export default async function Dashboard() {
  const user = await requireUser();
  const [quota, projects, characters] = await Promise.all([
    quotaFor(user),
    db.project.findMany({ where: { userId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 20 }),
    db.character.count({ where: { userId: user.id } }),
  ]);
  const pct = quota.unlimited ? 0 : Math.min(100, Math.round(((quota.videos - quota.left) / quota.videos) * 100));
  const firstName = user.name?.split(" ")[0];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{firstName ? `Welcome back, ${firstName}` : "Your studio"}</h1>
          <p className="hint mt-1">Plan your next series, or pick up where you left off.</p>
        </div>
        <Link href="/app/projects/new" className="btn-primary">New series</Link>
      </div>

      <section aria-label="Overview" className="grid gap-4 sm:grid-cols-3">
        <div className="card flex flex-col gap-3">
          <p className="hint">Videos left{quota.period === "month" ? " this month" : ""}</p>
          <p className="text-3xl font-bold tracking-tight">
            {quota.unlimited ? "Unlimited" : quota.left}
            {!quota.unlimited && <span className="text-lg font-medium text-muted"> / {quota.videos}</span>}
          </p>
          {!quota.unlimited && (
            <div className="h-1.5 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Videos used">
              <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
            </div>
          )}
          <p className="text-xs text-muted">
            {quota.unlimited ? "Admin" : `${quota.label} plan`} · up to {quota.maxSeconds}s each ·{" "}
            <Link href="/app/billing" className="font-semibold text-brand hover:underline">{quota.plan === "STUDIO" || quota.unlimited ? "View plans" : "Upgrade"}</Link>
          </p>
        </div>
        <div className="card flex flex-col gap-3">
          <p className="hint">Characters</p>
          <p className="text-3xl font-bold tracking-tight">{characters}</p>
          <p className="text-xs text-muted">Saved to your account and reused in every series.</p>
        </div>
        <div className="card flex flex-col gap-3">
          <p className="hint">Series</p>
          <p className="text-3xl font-bold tracking-tight">{projects.length}</p>
          <p className="text-xs text-muted">Each series can have up to 12 episodes.</p>
        </div>
      </section>

      <section aria-labelledby="series-heading" className="flex flex-col gap-4">
        <h2 id="series-heading" className="text-lg font-semibold">Your series</h2>
        {projects.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 border-dashed py-14 text-center">
            <h3 className="text-lg font-semibold">Start your first series</h3>
            <p className="hint max-w-md">Describe your story idea. We plan the episodes and cast, then you write, voice and render one episode at a time.</p>
            <Link href="/app/projects/new" className="btn-primary mt-2">Plan a series</Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link href={`/app/projects/${p.id}`} className="card flex h-full flex-col gap-2 transition-shadow hover:shadow-md">
                  <span className="font-semibold">{p.title}</span>
                  <span className="text-xs text-muted">
                    {p.episodeCount} episode{p.episodeCount > 1 ? "s" : ""} · {p.language} · updated {p.updatedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
