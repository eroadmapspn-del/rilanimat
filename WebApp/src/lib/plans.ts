import type { Role } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type PlanId = "FREE" | "PRO" | "STUDIO";

/** The one place that says what each plan includes. Prices are in paise and are always read here on the server. */
export const PLANS = {
  FREE: {
    label: "Free", pricePaise: 0, videos: 3, period: "total" as const, maxSeconds: 30, threeD: false, customizeAnimation: false,
    features: ["3 videos in total", "Up to 30 seconds each", "AI script writing and voice-over", "2D animation"],
  },
  PRO: {
    label: "Pro", pricePaise: 49_900, videos: 180, period: "month" as const, maxSeconds: 60, threeD: false, customizeAnimation: true,
    features: ["180 videos every month", "Up to 1 minute each", "AI script writing and voice-over", "Customisable 2D animation and your own characters"],
  },
  STUDIO: {
    label: "Studio", pricePaise: 99_900, videos: 600, period: "month" as const, maxSeconds: 90, threeD: true, customizeAnimation: true,
    features: ["600 videos every month", "Up to 90 seconds each", "Everything in Pro", "3D animation with Remotion (coming soon)", "AI support"],
  },
} satisfies Record<PlanId, unknown>;

export const PAID_PLANS = ["PRO", "STUDIO"] as const;
export const PLAN_DAYS = 30;
export const DAY_MS = 86_400_000;

type PlanUser = { role: Role; planStartedAt: Date | null; planExpiresAt: Date | null };

/** What this user may do right now. An expired PRO/STUDIO plan falls back to FREE. Admins get STUDIO features with no video cap. */
export function entitlements(u: PlanUser, now = new Date()) {
  const active = u.planExpiresAt != null && u.planExpiresAt > now;
  const plan: PlanId = u.role === "ADMIN" ? "STUDIO" : (u.role === "PRO" || u.role === "STUDIO") && active ? u.role : "FREE";
  const isFree = plan === "FREE";
  return {
    plan,
    ...PLANS[plan],
    unlimited: u.role === "ADMIN",
    /** Videos are counted from here: the day the plan was bought (paid) or ever (free). */
    countFrom: isFree || u.role === "ADMIN" ? null : u.planStartedAt,
    expiresAt: isFree ? null : u.planExpiresAt,
  };
}

/** Renders that count against the cap: every one that was not canceled or did not fail (a failed render is free). */
export const COUNTED = ["QUEUED", "RUNNING", "DONE"] as const;

export async function videosUsed(userId: string, countFrom: Date | null) {
  return db.renderJob.count({ where: { userId, status: { in: [...COUNTED] }, ...(countFrom ? { createdAt: { gte: countFrom } } : {}) } });
}

export async function quotaFor(user: { id: string } & PlanUser) {
  const ent = entitlements(user);
  const used = await videosUsed(user.id, ent.countFrom);
  return { ...ent, used, left: ent.unlimited ? Infinity : Math.max(0, ent.videos - used) };
}
