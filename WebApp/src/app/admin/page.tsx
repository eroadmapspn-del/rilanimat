import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { DAY_MS, PLAN_DAYS } from "@/lib/plans";
import { requireRole } from "@/lib/session";

async function setRole(formData: FormData) {
  "use server";
  const admin = await requireRole("ADMIN"); // re-checked here: a server action is a public endpoint
  const { userId, role } = z.object({ userId: z.string().min(1), role: z.enum(["FREE", "PRO", "STUDIO", "ADMIN"]) }).parse(Object.fromEntries(formData));
  if (userId === admin.id) return; // an admin cannot demote themselves and lock everyone out
  const now = new Date();
  // Giving a paid plan by hand starts a fresh 30 days; FREE and ADMIN clear the dates.
  const paid = role === "PRO" || role === "STUDIO";
  await db.user.update({
    where: { id: userId },
    data: { role, planStartedAt: paid ? now : null, planExpiresAt: paid ? new Date(now.getTime() + PLAN_DAYS * DAY_MS) : null },
  });
  revalidatePath("/admin");
}

export default async function AdminPage() {
  const me = await requireRole("ADMIN");
  const [users, sums] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { id: true, email: true, name: true, role: true, planExpiresAt: true, createdAt: true } }),
    db.renderJob.groupBy({ by: ["userId"], where: { status: { in: ["QUEUED", "RUNNING", "DONE"] } }, _count: true }),
  ]);
  const rendered = new Map(sums.map((s) => [s.userId, s._count]));
  const counts = { FREE: 0, PRO: 0, STUDIO: 0, ADMIN: 0 };
  for (const u of users) counts[u.role]++;
  const date = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Users</h1>
        <p className="hint mt-1">Change a plan by hand. A paid plan set here lasts 30 days from now.</p>
      </div>

      <section aria-label="Summary" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(Object.keys(counts) as (keyof typeof counts)[]).map((r) => (
          <div key={r} className="card !p-4">
            <p className="hint">{r === "FREE" ? "Free" : r === "PRO" ? "Pro" : r === "STUDIO" ? "Studio" : "Admins"}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{counts[r]}</p>
          </div>
        ))}
      </section>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <caption className="sr-only">All users</caption>
          <thead className="border-b border-border bg-subtle text-xs text-muted">
            <tr>
              <th scope="col" className="p-3 font-semibold">User</th>
              <th scope="col" className="p-3 font-semibold">Plan</th>
              <th scope="col" className="p-3 font-semibold">Expires</th>
              <th scope="col" className="p-3 font-semibold">Videos made</th>
              <th scope="col" className="p-3 font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-3">
                  <div className="font-medium">{u.name ?? "(no name)"}{u.id === me.id && <span className="badge ml-2">You</span>}</div>
                  <div className="text-xs text-muted">{u.email}</div>
                </td>
                <td className="p-3">
                  {u.id === me.id ? (
                    <span className="text-muted">Admin</span>
                  ) : (
                    <form action={setRole} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <label htmlFor={`r-${u.id}`} className="sr-only">Plan for {u.email}</label>
                      <select id={`r-${u.id}`} name="role" defaultValue={u.role} className="input !w-auto !py-1.5">
                        <option value="FREE">Free</option><option value="PRO">Pro</option><option value="STUDIO">Studio</option><option value="ADMIN">Admin</option>
                      </select>
                      <button className="btn-secondary !py-1.5">Save</button>
                    </form>
                  )}
                </td>
                <td className="p-3 text-xs text-muted">{u.planExpiresAt ? date(u.planExpiresAt) : "-"}</td>
                <td className="p-3">{rendered.get(u.id) ?? 0}</td>
                <td className="p-3 text-xs text-muted">{date(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
