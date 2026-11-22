import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/session";
import { db } from "@/lib/db";
import { razorpay, verifyPaymentSignature } from "@/lib/razorpay";
import { fulfillOrder } from "@/lib/billing";

const body = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: sig } = parsed.data;

  if (!verifyPaymentSignature(orderId, paymentId, sig)) return NextResponse.json({ error: "bad signature" }, { status: 400 });
  // The order must belong to the signed-in user.
  const order = await db.order.findFirst({ where: { razorpayOrderId: orderId, userId: user.id } });
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  const payment = await razorpay().payments.fetch(paymentId);
  if (payment.order_id !== orderId || !["captured", "authorized"].includes(String(payment.status)))
    return NextResponse.json({ error: "payment not completed" }, { status: 400 });
  const r = await fulfillOrder(orderId, paymentId, Number(payment.amount));
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
