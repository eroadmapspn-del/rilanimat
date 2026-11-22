import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/session";
import { db } from "@/lib/db";
import { lookSchema } from "@/lib/look";

const MAX_CHARACTERS = 30;
const create = z.object({
  name: z.string().trim().min(1).max(40),
  description: z.string().trim().max(1000),
  look: lookSchema,
});

// Every query is scoped by the signed-in user's id: nobody can read or touch another user's characters.
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const characters = await db.character.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ characters });
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = create.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  if ((await db.character.count({ where: { userId: user.id } })) >= MAX_CHARACTERS)
    return NextResponse.json({ error: "character limit reached" }, { status: 409 });
  try {
    const character = await db.character.create({ data: { ...parsed.data, userId: user.id } });
    return NextResponse.json({ character }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "you already have a character with that name" }, { status: 409 });
  }
}
