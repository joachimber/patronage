import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { files, tiers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { storage } from "@/lib/storage";

const MAX_BYTES = 100 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.creatorId) {
    return NextResponse.json({ error: "Not a creator" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected multipart form-data" }, { status: 400 });
  }

  const tierId = form.get("tierId");
  const file = form.get("file");
  if (typeof tierId !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing tierId or file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 413 },
    );
  }

  const [tier] = await db()
    .select()
    .from(tiers)
    .where(and(eq(tiers.id, tierId), eq(tiers.creatorId, session.creatorId)));
  if (!tier) {
    return NextResponse.json({ error: "Tier not yours" }, { status: 403 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const { storageKey, sizeBytes } = await storage().put({
    bytes,
    filename: file.name,
    contentType: file.type || undefined,
  });

  const [row] = await db()
    .insert(files)
    .values({
      tierId,
      filename: file.name,
      storageKey,
      contentType: file.type || null,
      sizeBytes: BigInt(sizeBytes),
    })
    .returning();

  return NextResponse.json({
    file: {
      id: row.id,
      filename: row.filename,
      contentType: row.contentType,
      sizeBytes: row.sizeBytes ? Number(row.sizeBytes) : sizeBytes,
    },
  });
}
