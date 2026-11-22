import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <AppHeader user={user} />
      <main id="content" className="container-page flex flex-1 flex-col gap-8 py-8 sm:py-10">{children}</main>
    </>
  );
}
