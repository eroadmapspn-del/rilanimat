"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="content" className="container-page flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="text-3xl font-bold tracking-tight">This page hit a problem</h1>
      <p className="hint max-w-md">It is on our side, not yours. Try again, and if it keeps happening, come back in a few minutes.</p>
      {error.digest && <p className="text-xs text-muted">Reference: {error.digest}</p>}
      <div className="mt-2 flex gap-3">
        <button onClick={reset} className="btn-primary">Try again</button>
        <Link href="/" className="btn-secondary">Back to home</Link>
      </div>
    </main>
  );
}
