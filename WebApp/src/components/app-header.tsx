import Link from "next/link";
import { signOut } from "@/auth";
import { Logo } from "@/components/logo";
import { entitlements } from "@/lib/plans";
import type { Role } from "@/generated/prisma/client";

type HeaderUser = { email: string | null; name: string | null; role: Role; planStartedAt: Date | null; planExpiresAt: Date | null };

export function AppHeader({ user }: { user: HeaderUser }) {
  const ent = entitlements(user);
  const links: [string, string][] = [["Studio", "/app"], ["New series", "/app/projects/new"], ["Plans", "/app/billing"]];
  if (user.role === "ADMIN") links.push(["Admin", "/admin"]);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo href="/app" />
          <nav aria-label="App" className="hidden items-center gap-1 sm:flex">
            {links.map(([label, href]) => (
              <Link key={href} href={href} className="btn-ghost">{label}</Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge">{user.role === "ADMIN" ? "Admin" : ent.label}</span>
          <span className="hidden max-w-[14rem] truncate text-sm text-muted md:inline" title={user.email ?? undefined}>{user.email}</span>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
            <button className="btn-secondary">Sign out</button>
          </form>
        </div>
      </div>
      <nav aria-label="App (mobile)" className="container-page flex gap-1 overflow-x-auto pb-2 sm:hidden">
        {links.map(([label, href]) => (
          <Link key={href} href={href} className="btn-ghost !px-3 !py-1.5">{label}</Link>
        ))}
      </nav>
    </header>
  );
}
