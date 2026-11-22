import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { fulfillOrder } from "@/lib/billing";

// The webhook is the source of truth: it still grants credits if the user closes the tab before the callback.
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, sig)) return NextResponse.json({ error: "bad signature" }, { status: 400 });

  const event = JSON.parse(raw) as {
    event: string;
    payload?: { payment?: { entity?: { id: string; order_id: string; amount: number } } };
  };
  const pay = event.payload?.payment?.entity;
  if (event.event === "payment.captured" && pay) await fulfillOrder(pay.order_id, pay.id, pay.amount);
  return NextResponse.json({ ok: true });
}
