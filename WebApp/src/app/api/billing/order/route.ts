import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/session";
import { db } from "@/lib/db";
import { razorpay } from "@/lib/razorpay";
import { rateLimit } from "@/lib/limit";
import { PLANS } from "@/lib/plans";

const body = z.object({ plan: z.enum(["PRO", "STUDIO"]) });

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`order:${user.id}`, 5, 60_000)) return NextResponse.json({ error: "slow down" }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a plan." }, { status: 400 });

  // The price comes from the server's plan table, never from the browser.
  const { plan } = parsed.data;
  const amountPaise = PLANS[plan].pricePaise;
  const rzp = await razorpay().orders.create({ amount: amountPaise, currency: "INR", receipt: `u_${Date.now()}`, notes: { plan } });
  await db.order.create({ data: { userId: user.id, razorpayOrderId: rzp.id, amountPaise, plan } });
  return NextResponse.json({ orderId: rzp.id, amount: amountPaise, currency: "INR", keyId: process.env.RAZORPAY_KEY_ID });
}
