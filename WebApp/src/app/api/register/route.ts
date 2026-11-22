import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/limit";

const schema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email.").max(200),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`register:${ip}`, 5, 10 * 60_000)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your details." }, { status: 400 });
  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "That email already has an account. Sign in instead." }, { status: 409 });
  await db.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 12) } });
  return NextResponse.json({ ok: true }, { status: 201 });
}
