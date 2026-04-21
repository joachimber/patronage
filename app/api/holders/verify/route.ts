import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { creators, tiers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { getTokenBalance } from "@/lib/helius";
import { ensureHolder, reconcile } from "@/lib/grant";

/**
 * Trigger a holdings re-verify for the signed-in wallet against a creator's
 * token. Runs the full reconcile loop: fetches current balance, figures out
 * the right tier, grants and revokes as needed.
 *
 * Returns the resulting tier + plugin grants so the client can update its UI
 * without a full page reload.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session.wallet) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const handle = typeof json?.handle === "string" ? json.handle : null;
  const creatorId = typeof json?.creatorId === "string" ? json.creatorId : null;
  if (!handle && !creatorId) {
    return NextResponse.json(
      { error: "Missing handle or creatorId" },
      { status: 400 },
    );
  }

  const [creator] = handle
    ? await db().select().from(creators).where(eq(creators.handle, handle))
    : await db().select().from(creators).where(eq(creators.id, creatorId!));

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }
  if (!creator.tokenMint) {
    return NextResponse.json(
      { error: "Creator has not launched their token yet" },
      { status: 409 },
    );
  }

  const holderId = await ensureHolder(session.wallet, creator.id);
  const balance = await getTokenBalance(session.wallet, creator.tokenMint);
  const result = await reconcile(holderId, balance);

  const currentTier = result.currentTierId
    ? (
        await db()
          .select()
          .from(tiers)
          .where(eq(tiers.id, result.currentTierId))
      )[0] ?? null
    : null;

  return NextResponse.json({
    balance: balance.toString(),
    holderId,
    previousTierId: result.previousTierId,
    currentTierId: result.currentTierId,
    currentTierName: currentTier?.name ?? null,
    granted: result.granted,
    revoked: result.revoked,
    errors: result.errors,
  });
}
