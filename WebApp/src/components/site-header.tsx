import Link from "next/link";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";

const links = [
  ["How it works", "/#how"],
  ["Why Reel Studio", "/#why"],
  ["Pricing", "/#pricing"],
  ["FAQ", "/#faq"],
] as const;

export async function SiteHeader() {
  const signedIn = Boolean((await auth())?.user?.id);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="btn-ghost">{label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link href="/app" className="btn-primary">Open studio</Link>
          ) : (
            <>
              <Link href="/sign-in" className="btn-ghost">Sign in</Link>
              <Link href="/sign-up" className="btn-primary">Get started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
