import { NextResponse } from "next/server";
import { z } from "zod";
import { guarded } from "@/lib/api";
import { editScript, generateScript } from "@/lib/pipeline/service";

export const maxDuration = 180; // up to three Gemini calls (draft + two rewrites)

type Ctx = { params: Promise<{ id: string; n: string }> };

const num = (n: string) => {
  const v = Number(n);
  return Number.isInteger(v) && v > 0 ? v : 0;
};

/** Write (or rewrite) this episode's script with Gemini. */
export const POST = (_req: Request, ctx: Ctx) =>
  guarded({ key: "script", max: 20, windowMs: 3_600_000 }, async (user) => {
    const { id, n } = await ctx.params;
    const result = await generateScript(user.id, id, num(n));
    return NextResponse.json({ ok: true, version: result.version, words: result.wordCount, seconds: result.estimatedSeconds, warnings: result.warnings });
  });

/** Save the user's edits: spoken text (one string per scene) and/or camera + transition per scene (Pro and Studio). */
export const PATCH = (req: Request, ctx: Ctx) =>
  guarded({ key: "edit", max: 60, windowMs: 3_600_000 }, async (user) => {
    const { id, n } = await ctx.params;
    const parsed = z
      .object({
        texts: z.array(z.string().max(700)).min(1).max(40).optional(),
        animation: z.array(z.object({ camera: z.string().max(30), transition: z.string().max(30) })).min(1).max(40).optional(),
      })
      .refine((v) => v.texts || v.animation)
      .safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
    await editScript(user.id, id, num(n), parsed.data);
    return NextResponse.json({ ok: true });
  });
