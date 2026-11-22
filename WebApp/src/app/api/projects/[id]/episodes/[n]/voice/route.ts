import { NextResponse } from "next/server";
import { z } from "zod";
import { guarded } from "@/lib/api";
import { generateVoice } from "@/lib/pipeline/service";

export const maxDuration = 180; // Gemini speech for a whole episode takes 20-60 s

export const POST = (req: Request, ctx: { params: Promise<{ id: string; n: string }> }) =>
  guarded({ key: "voice", max: 12, windowMs: 3_600_000 }, async (user) => {
    const { id, n } = await ctx.params;
    const body = z.object({ voice: z.string().max(30).optional() }).safeParse(await req.json().catch(() => ({})));
    const meta = await generateVoice(user.id, id, Number(n), body.success ? body.data.voice : undefined);
    return NextResponse.json({ ok: true, seconds: meta.duration, timing: meta.timing, assetId: meta.assetId });
  });
