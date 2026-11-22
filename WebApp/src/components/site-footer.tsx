import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-subtle">
      <div className="container-page flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="hint max-w-xs">Narrated, animated story reels with characters that are yours.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <Link href="/#how" className="hover:text-foreground">How it works</Link>
          <Link href="/#pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/sign-in" className="hover:text-foreground">Sign in</Link>
          <Link href="/sign-up" className="hover:text-foreground">Create account</Link>
        </nav>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted">© {new Date().getFullYear()} Reel Studio. All rights reserved.</div>
    </footer>
  );
}
