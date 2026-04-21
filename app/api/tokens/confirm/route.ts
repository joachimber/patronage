import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { creators } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";

const schema = z.object({
  tokenMint: z.string().min(32).max(64),
  tokenTicker: z.string().trim().min(1).max(12),
  tokenName: z.string().trim().min(1).max(120),
  tokenImageUrl: z.string().url().optional(),
  signature: z.string().min(10).optional(),
  partnerBps: z.number().int().min(0).max(10_000).optional(),
});

/**
 * Called after the browser wallet has signed and submitted the launch tx.
 * Persists the mint to the creator record so their profile page shows it.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session.creatorId) {
    return NextResponse.json({ error: "Not a creator" }, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await db()
    .update(creators)
    .set({
      tokenMint: parsed.data.tokenMint,
      tokenTicker: parsed.data.tokenTicker,
      tokenName: parsed.data.tokenName,
      tokenImageUrl: parsed.data.tokenImageUrl,
      partnerBps: parsed.data.partnerBps ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(creators.id, session.creatorId));
  return NextResponse.json({ ok: true });
}
