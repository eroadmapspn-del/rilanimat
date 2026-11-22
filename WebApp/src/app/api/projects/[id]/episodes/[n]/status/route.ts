import { NextResponse } from "next/server";
import { guarded } from "@/lib/api";
import { db } from "@/lib/db";

/** Polled by the page while a render is running. Scoped to the signed-in user. */
export const GET = (_req: Request, ctx: { params: Promise<{ id: string; n: string }> }) =>
  guarded(null, async (user) => {
    const { id, n } = await ctx.params;
    const ep = await db.episode.findFirst({
      where: { projectId: id, number: Number(n), userId: user.id },
      select: { stage: true, error: true, renders: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, progress: true, error: true, outputAssetId: true } } },
    });
    if (!ep) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ stage: ep.stage, error: ep.error, render: ep.renders[0] ?? null });
  });
