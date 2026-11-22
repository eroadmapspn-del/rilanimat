"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewSeries() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prompt: String(f.get("prompt")),
        language: String(f.get("language")),
        episodes: Number(f.get("episodes")),
        seconds: Number(f.get("seconds")),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not plan the series.");
      setBusy(false);
      return;
    }
    router.push(`/app/projects/${data.id}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Link href="/app" className="text-sm text-muted hover:text-foreground">← Your studio</Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">New series</h1>
        <p className="hint mt-1">Give a topic or a full prompt. We plan the whole series first, then you write and approve one episode at a time.</p>
      </div>
      <form onSubmit={submit} className="card flex flex-col gap-5">
        <div>
          <label htmlFor="prompt" className="label">Your idea</label>
          <textarea id="prompt" name="prompt" required minLength={10} maxLength={4000} rows={6} className="input"
            placeholder="A night watchman at an old railway station hears a train bell every night, but no train ever comes." />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="language" className="label">Language</label>
            <select id="language" name="language" defaultValue="Hindi" className="input"><option>Hindi</option><option>Hinglish</option><option>English</option></select>
          </div>
          <div>
            <label htmlFor="episodes" className="label">Episodes</label>
            <input id="episodes" name="episodes" type="number" min={1} max={12} defaultValue={3} className="input" />
          </div>
          <div>
            <label htmlFor="seconds" className="label">Seconds each</label>
            <input id="seconds" name="seconds" type="number" min={15} max={90} defaultValue={30} className="input" />
          </div>
        </div>
        <p className="hint">Your plan sets the longest video you can make: 30 seconds on Free, 60 on Pro, 90 on Studio.</p>
        {error && (
          <p role="alert" className="alert-error">
            {error} {/plan|upgrade/i.test(error) && <Link href="/app/billing" className="font-semibold underline">See plans</Link>}
          </p>
        )}
        <button disabled={busy} className="btn-primary btn-lg">{busy ? "Planning your series… (about 20 seconds)" : "Plan my series"}</button>
      </form>
    </div>
  );
}
