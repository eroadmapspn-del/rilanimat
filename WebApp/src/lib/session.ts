import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/** The signed-in user's row in OUR database, or null. The JWT proves who they are; credits, characters, projects and
 *  the role are read fresh from the database so a deleted or demoted user loses access immediately. */
export async function getUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({ where: { id: session.user.id } });
}

/** The real authorization check. Call it first in every server component, action and route handler under /app. */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** Require one of the given roles. Not signed in -> sign-in page; wrong role -> back to the dashboard. */
export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/app");
  return user;
}
