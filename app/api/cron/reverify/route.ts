import { NextResponse } from "next/server";
import { eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { creators, holders } from "@/lib/db/schema";
import { getTokenBalance } from "@/lib/helius";
import { reconcile } from "@/lib/grant";
import { env } from "@/lib/env";

/**
 * Re-verify a batch of holders. Runs daily on Vercel Cron; exists only to
 * keep `holders.lastBalance` / `currentTierId` fresh for dashboard queries.
 * Actual access enforcement happens at request time on the tier page and
 * file stream routes, so a sell is blocked instantly — not on the next cron.
 *
 * Protected by a shared secret. Pass `?dry=1` to preview without writing.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const authz = req.headers.get("authorization");

  try {
    const expected = env.CRON_SECRET;
    if (expected && secret !== expected && authz !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {
    // CRON_SECRET not set — allow in dev only.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "CRON_SECRET not set in production" },
        { status: 500 },
      );
    }
  }

  const limit = Number(url.searchParams.get("limit") ?? "50");
  const dry = url.searchParams.get("dry") === "1";

  // Gather holders whose creator has a live mint. Oldest `lastVerifiedAt`
  // first — holders that haven't been checked recently.
  const rows = await db()
    .select({ holder: holders, creator: creators })
    .from(holders)
    .innerJoin(creators, eq(holders.creatorId, creators.id))
    .where(isNotNull(creators.tokenMint))
    .limit(limit);

  const results: Array<{
    holderId: string;
    wallet: string;
    creator: string;
    balance: string;
    currentTierId: string | null;
    granted: string[];
    revoked: string[];
    errors: number;
  }> = [];

  for (const { holder, creator } of rows) {
    if (!creator.tokenMint) continue;
    try {
      const balance = await getTokenBalance(holder.wallet, creator.tokenMint);
      if (dry) {
        results.push({
          holderId: holder.id,
          wallet: holder.wallet,
          creator: creator.handle,
          balance: balance.toString(),
          currentTierId: holder.currentTierId,
          granted: [],
          revoked: [],
          errors: 0,
        });
        continue;
      }
      const r = await reconcile(holder.id, balance);
      results.push({
        holderId: holder.id,
        wallet: holder.wallet,
        creator: creator.handle,
        balance: balance.toString(),
        currentTierId: r.currentTierId,
        granted: r.granted,
        revoked: r.revoked,
        errors: r.errors.length,
      });
    } catch (e) {
      results.push({
        holderId: holder.id,
        wallet: holder.wallet,
        creator: creator.handle,
        balance: "0",
        currentTierId: holder.currentTierId,
        granted: [],
        revoked: [],
        errors: 1,
      });
      console.error("reverify error", holder.id, e);
    }
  }

  return NextResponse.json({
    checked: results.length,
    dry,
    results,
    ranAt: new Date().toISOString(),
  });
}
