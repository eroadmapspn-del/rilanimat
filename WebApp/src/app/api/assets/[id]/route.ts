import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/session";
import { assetResponse } from "@/lib/storage";

/** The only way a browser gets a stored file. The asset must belong to the signed-in user. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const asset = await db.asset.findFirst({ where: { id, userId: user.id } });
  if (!asset) return NextResponse.json({ error: "not found" }, { status: 404 });
  const download = new URL(req.url).searchParams.get("download") ? `episode-${asset.id.slice(-6)}.${asset.mime === "video/mp4" ? "mp4" : "wav"}` : undefined;
  return assetResponse(asset, req.headers.get("range"), download);
}
