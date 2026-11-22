import { NextResponse } from "next/server";
import { guarded } from "@/lib/api";
import { approveScript } from "@/lib/pipeline/service";

export const POST = (_req: Request, ctx: { params: Promise<{ id: string; n: string }> }) =>
  guarded({ key: "approve", max: 60, windowMs: 3_600_000 }, async (user) => {
    const { id, n } = await ctx.params;
    await approveScript(user.id, id, Number(n));
    return NextResponse.json({ ok: true });
  });
