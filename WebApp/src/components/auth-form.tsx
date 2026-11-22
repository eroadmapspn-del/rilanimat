"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

/** Only same-site paths are allowed as a post-login destination (blocks open redirects). */
function safeDestination(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/app";
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9Z" />
  </svg>
);

const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z" />
  </svg>
);

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const dest = safeDestination(useSearchParams().get("callbackUrl"));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isUp = mode === "sign-up";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "");
    const password = String(f.get("password") ?? "");
    try {
      if (isUp) {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: f.get("name"), email, password }),
        });
        if (!res.ok) {
          setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Could not create the account.");
          return;
        }
      }
      const r = await signIn("credentials", { email, password, redirect: false });
      if (r?.error) setError("Wrong email or password.");
      else window.location.assign(dest);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{isUp ? "Create your account" : "Welcome back"}</h1>
        <p className="hint mt-1">{isUp ? "Free to start. 3 videos on us, no card needed." : "Sign in to continue to your studio."}</p>
      </div>
      <div className="flex flex-col gap-3">
        <button type="button" className="btn-secondary" onClick={() => signIn("google", { callbackUrl: dest })}><GoogleIcon /> Continue with Google</button>
        <button type="button" className="btn-secondary" onClick={() => signIn("github", { callbackUrl: dest })}><GitHubIcon /> Continue with GitHub</button>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted" role="separator"><span className="h-px flex-1 bg-border" />or with email<span className="h-px flex-1 bg-border" /></div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {isUp && (
          <div><label htmlFor="name" className="label">Name</label><input id="name" name="name" autoComplete="name" required maxLength={80} className="input" /></div>
        )}
        <div><label htmlFor="email" className="label">Email</label><input id="email" name="email" type="email" autoComplete="email" required className="input" /></div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" name="password" type="password" autoComplete={isUp ? "new-password" : "current-password"} minLength={isUp ? 8 : undefined} required className="input" />
          {isUp && <p className="hint mt-1">At least 8 characters.</p>}
        </div>
        {error && <p role="alert" className="alert-error">{error}</p>}
        <button disabled={busy} className="btn-primary">{busy ? "Please wait…" : isUp ? "Create account" : "Sign in"}</button>
      </form>
      <p className="text-center text-sm text-muted">
        {isUp ? (
          <>Already have an account? <Link href="/sign-in" className="font-semibold text-brand hover:underline">Sign in</Link></>
        ) : (
          <>New to Reel Studio? <Link href="/sign-up" className="font-semibold text-brand hover:underline">Create an account</Link></>
        )}
      </p>
    </div>
  );
}
