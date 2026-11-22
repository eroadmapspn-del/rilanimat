import { NextResponse } from "next/server";
import { z } from "zod";
import { guarded } from "@/lib/api";
import { languageSchema } from "@/lib/pipeline/types";
import { createSeries } from "@/lib/pipeline/service";

export const maxDuration = 120; // planning calls Gemini

const body = z.object({
  prompt: z.string().trim().min(10, "Describe your idea in a sentence or two.").max(4000),
  language: languageSchema,
  episodes: z.number().int().min(1).max(12),
  seconds: z.number().int().min(15).max(90).default(30),
});

export const POST = (req: Request) =>
  guarded({ key: "plan", max: 6, windowMs: 3_600_000 }, async (user) => {
    const parsed = body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid" }, { status: 400 });
    const project = await createSeries(user.id, parsed.data);
    return NextResponse.json({ id: project.id, title: project.title }, { status: 201 });
  });
