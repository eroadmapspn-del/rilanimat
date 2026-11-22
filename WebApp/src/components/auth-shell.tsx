import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";

const points = ["Script, voice-over and animation in one place", "Characters that look the same in every episode", "Hindi, Hinglish and English"];

export function AuthShell({ mode }: { mode: "sign-in" | "sign-up" }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <main id="content" className="flex flex-1 items-center justify-center py-10">
          <Suspense>
            <AuthForm mode={mode} />
          </Suspense>
        </main>
      </div>
      <aside className="hidden flex-col justify-center gap-6 bg-gradient-to-br from-indigo-700 via-violet-700 to-slate-900 p-14 text-white lg:flex">
        <h2 className="max-w-md text-3xl font-bold tracking-tight text-balance">Turn story ideas into reels people follow.</h2>
        <ul className="flex flex-col gap-3 text-indigo-100">
          {points.map((p) => (
            <li key={p} className="flex gap-3"><span aria-hidden="true">✓</span>{p}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
