import type { Metadata } from "next";
import { PAID_PLANS, PLANS, quotaFor } from "@/lib/plans";
import { requireUser } from "@/lib/session";
import { CheckoutButton } from "./checkout-button";

export const metadata: Metadata = { title: "Plans" };

export default async function BillingPage() {
  const user = await requireUser();
  const q = await quotaFor(user);
  const date = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Plans</h1>
        <p className="hint mt-1">
          You are on <strong className="text-foreground">{user.role === "ADMIN" ? "Admin" : q.label}</strong>
          {q.expiresAt && <> · active until {date(q.expiresAt)}</>}
          {!q.unlimited && <> · {q.left} of {q.videos} videos left{q.period === "month" ? " this month" : ""}</>}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {(["FREE", ...PAID_PLANS] as const).map((id) => {
          const p = PLANS[id];
          const current = q.plan === id && !q.unlimited;
          const featured = id === "PRO";
          return (
            <div key={id} className={`card flex flex-col gap-5 ${featured ? "relative border-2 !border-brand shadow-lg" : ""}`}>
              {featured && <span className="badge absolute -top-3 left-6">Most popular</span>}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{p.label}</h2>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight">₹{p.pricePaise / 100}</span>
                    {p.pricePaise ? <span className="text-muted">/ month</span> : <span className="text-muted">forever</span>}
                  </p>
                </div>
                {current && <span className="badge">Current</span>}
              </div>
              <ul className="flex flex-1 flex-col gap-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-success" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z" clipRule="evenodd" /></svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {id === "FREE" ? (
                <p className="hint text-center">{current ? "Your current plan" : "Included for everyone"}</p>
              ) : (
                <CheckoutButton plan={id} label={current ? "Renew for 30 days" : `Choose ${p.label}`} featured={featured} />
              )}
            </div>
          );
        })}
      </div>
      <p className="hint">
        Each payment gives 30 days. Paying again before it ends adds 30 more days and restarts your video count. A failed render never counts against your videos.
      </p>
    </>
  );
}
