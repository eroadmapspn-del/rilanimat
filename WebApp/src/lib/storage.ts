import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "@/lib/db";
import type { AssetKind } from "@/generated/prisma/client";

/**
 * Private project file storage. Keys look like  users/<userId>/projects/<projectId>/<kind>/<uuid>.<ext>
 * Local disk in development (STORAGE_DIR, default ./.storage); any S3-compatible bucket (R2, S3, Supabase) when S3_BUCKET
 * is set. Files are never public: the browser fetches them through /api/assets/<id>, which checks ownership first.
 */
const useS3 = Boolean(process.env.S3_BUCKET);
const root = () => path.resolve(process.env.STORAGE_DIR ?? ".storage");

let s3: S3Client | null = null;
const client = () =>
  (s3 ??= new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
  }));

function safePath(key: string) {
  const p = path.resolve(root(), key);
  if (!p.startsWith(root() + path.sep)) throw new Error("Invalid storage key.");
  return p;
}

const EXT_FOR_MIME: Record<string, string> = { "audio/wav": "wav", "video/mp4": "mp4", "image/png": "png", "image/jpeg": "jpg" };

export async function saveAsset(opts: { userId: string; projectId: string; kind: AssetKind; mime: string; data: Buffer }) {
  const key = `users/${opts.userId}/projects/${opts.projectId}/${opts.kind.toLowerCase()}/${randomUUID()}.${EXT_FOR_MIME[opts.mime] ?? "bin"}`;
  if (useS3) {
    await client().send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: opts.data, ContentType: opts.mime }));
  } else {
    const p = safePath(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, opts.data);
  }
  return db.asset.create({
    data: {
      userId: opts.userId, projectId: opts.projectId, kind: opts.kind, key, mime: opts.mime, bytes: opts.data.length,
      sha256: createHash("sha256").update(opts.data).digest("hex"),
    },
  });
}

export async function readAsset(key: string): Promise<Buffer> {
  if (useS3) {
    const r = await client().send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    return Buffer.from(await r.Body!.transformToByteArray());
  }
  return readFile(safePath(key));
}

export async function deleteAsset(key: string) {
  if (useS3) await client().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
  else await rm(safePath(key), { force: true });
}

/** A Response for the browser: S3 redirects to a 5-minute signed URL; local disk streams with Range support (video seeking). */
export async function assetResponse(asset: { key: string; mime: string; bytes: number }, range: string | null, download?: string) {
  const headers: Record<string, string> = {
    "content-type": asset.mime,
    "cache-control": "private, max-age=300",
    "x-content-type-options": "nosniff",
    ...(download ? { "content-disposition": `attachment; filename="${download}"` } : {}),
  };
  if (useS3) {
    const url = await getSignedUrl(client(), new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: asset.key }), { expiresIn: 300 });
    return new Response(null, { status: 302, headers: { location: url } });
  }
  const p = safePath(asset.key);
  const size = (await stat(p)).size;
  const m = range ? /bytes=(\d*)-(\d*)/.exec(range) : null;
  if (m) {
    const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
    const end = m[2] && m[1] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    const stream = Readable.toWeb(createReadStream(p, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers: { ...headers, "accept-ranges": "bytes", "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) } });
  }
  const stream = Readable.toWeb(createReadStream(p)) as ReadableStream;
  return new Response(stream, { status: 200, headers: { ...headers, "accept-ranges": "bytes", "content-length": String(size) } });
}
