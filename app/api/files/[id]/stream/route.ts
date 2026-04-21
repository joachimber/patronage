import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { creators, files, tiers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { getTokenBalance } from "@/lib/helius";
import { storage } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [row] = await db()
    .select({ file: files, tier: tiers, creator: creators })
    .from(files)
    .innerJoin(tiers, eq(files.tierId, tiers.id))
    .innerJoin(creators, eq(tiers.creatorId, creators.id))
    .where(eq(files.id, id));

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await getSession();
  if (!session.wallet) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  if (!row.creator.tokenMint) {
    return NextResponse.json(
      { error: "Creator has not linked a token yet" },
      { status: 409 },
    );
  }

  let balance = 0n;
  try {
    balance = await getTokenBalance(session.wallet, row.creator.tokenMint);
  } catch {
    return NextResponse.json({ error: "Balance check failed" }, { status: 502 });
  }

  if (balance < row.tier.threshold) {
    return NextResponse.json(
      {
        error: "Insufficient holdings",
        required: row.tier.threshold.toString(),
        have: balance.toString(),
      },
      { status: 403 },
    );
  }

  const stream = await storage().get(row.file.storageKey);
  const web = Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>;

  const headers = new Headers();
  headers.set("Content-Type", row.file.contentType ?? "application/octet-stream");
  headers.set(
    "Content-Disposition",
    `attachment; filename="${encodeFilename(row.file.filename)}"`,
  );
  if (row.file.sizeBytes) {
    headers.set("Content-Length", row.file.sizeBytes.toString());
  }
  headers.set("Cache-Control", "private, no-store");

  return new Response(web, { headers });
}

function encodeFilename(name: string): string {
  return name.replace(/[\r\n"]/g, "_");
}
