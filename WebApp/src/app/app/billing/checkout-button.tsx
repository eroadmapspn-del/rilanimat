"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RazorpayCheckout = { open: () => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

function loadCheckout() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function CheckoutButton({ plan, label, featured = false }: { plan: "PRO" | "STUDIO"; label: string; featured?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function pay() {
    setBusy(true);
    setMsg("");
    try {
      if (!(await loadCheckout())) return setMsg("Could not load the payment window. Check your connection.");
      const res = await fetch("/api/billing/order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan }) });
      const order = await res.json().catch(() => ({}));
      if (!res.ok) return setMsg(order.error ?? "Could not start the payment.");
      new window.Razorpay!({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "Reel Studio",
        description: `${plan === "PRO" ? "Pro" : "Studio"} plan, 30 days`,
        handler: async (r: Record<string, string>) => {
          const v = await fetch("/api/billing/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(r) });
          setMsg(v.ok ? "Payment received. Your plan is active." : "Payment received. If your plan does not appear in a minute, contact support.");
          router.refresh();
        },
      }).open();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button onClick={pay} disabled={busy} className={featured ? "btn-primary" : "btn-secondary"}>
        {busy ? "Please wait…" : label}
      </button>
      {msg && <p role="status" className="hint">{msg}</p>}
    </div>
  );
}
