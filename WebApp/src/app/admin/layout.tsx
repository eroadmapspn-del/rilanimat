import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ADMIN");
  return (
    <>
      <AppHeader user={user} />
      <main id="content" className="container-page flex flex-1 flex-col gap-8 py-8 sm:py-10">{children}</main>
    </>
  );
}
