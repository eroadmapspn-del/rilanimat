import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="content" className="container-page flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="eyebrow">404</p>
        <h1 className="text-3xl font-bold tracking-tight">We could not find that page</h1>
        <p className="hint max-w-md">The link may be broken, or the page may have been moved.</p>
        <Link href="/" className="btn-primary mt-2">Back to home</Link>
      </main>
      <SiteFooter />
    </>
  );
}
