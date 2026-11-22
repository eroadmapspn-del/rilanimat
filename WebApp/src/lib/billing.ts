import { db } from "@/lib/db";
import { DAY_MS, PLANS, PLAN_DAYS } from "@/lib/plans";

/** Mark an order paid and start (or extend) the plan. Idempotent: called by both the checkout callback and the webhook. */
export async function fulfillOrder(razorpayOrderId: string, paymentId: string, paidPaise: number) {
  const order = await db.order.findUnique({ where: { razorpayOrderId } });
  if (!order) return { ok: false as const, reason: "unknown-order" };
  if (paidPaise !== order.amountPaise || paidPaise !== PLANS[order.plan].pricePaise) return { ok: false as const, reason: "amount-mismatch" };

  // Only the call that flips the order to PAID activates the plan, so a retried webhook cannot add a second month.
  const flipped = await db.order.updateMany({
    where: { id: order.id, status: { not: "PAID" } },
    data: { status: "PAID", razorpayPaymentId: paymentId, paidAt: new Date() },
  });
  if (flipped.count === 0) return { ok: true as const };

  await db.$transaction(async (tx) => {
    const u = await tx.user.findUniqueOrThrow({ where: { id: order.userId } });
    if (u.role === "ADMIN") return; // admins keep their role; the order is still recorded as paid
    const now = new Date();
    // Renewing early keeps the days that are left; the video count starts fresh from today.
    const base = u.planExpiresAt && u.planExpiresAt > now ? u.planExpiresAt : now;
    await tx.user.update({
      where: { id: u.id },
      data: { role: order.plan, planStartedAt: now, planExpiresAt: new Date(base.getTime() + PLAN_DAYS * DAY_MS) },
    });
  });
  return { ok: true as const };
}
