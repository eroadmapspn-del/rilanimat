import { NextResponse } from "next/server";
import { guarded } from "@/lib/api";
import { requestRender } from "@/lib/pipeline/service";

/** Queues the render. The worker process picks it up. */
export const POST = (_req: Request, ctx: { params: Promise<{ id: string; n: string }> }) =>
  guarded({ key: "render", max: 10, windowMs: 3_600_000 }, async (user) => {
    const { id, n } = await ctx.params;
    const { jobId } = await requestRender(user.id, id, Number(n));
    return NextResponse.json({ ok: true, jobId }, { status: 202 });
  });
