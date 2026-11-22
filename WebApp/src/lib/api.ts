import { NextResponse } from "next/server";
import { getUser } from "@/lib/session";
import { rateLimit } from "@/lib/limit";
import { PipelineError } from "@/lib/pipeline/service";

type User = NonNullable<Awaited<ReturnType<typeof getUser>>>;

/** Wraps a route handler: requires a signed-in user, applies a per-user rate limit, and turns errors into clean JSON. */
export async function guarded(
  limit: { key: string; max: number; windowMs: number } | null,
  run: (user: User) => Promise<Response>,
): Promise<Response> {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (limit && !rateLimit(`${limit.key}:${user.id}`, limit.max, limit.windowMs))
    return NextResponse.json({ error: "Too many requests. Please wait a bit." }, { status: 429 });
  try {
    return await run(user);
  } catch (e) {
    if (e instanceof PipelineError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
