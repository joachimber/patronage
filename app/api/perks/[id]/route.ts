import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { perks, tiers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";

async function ownedPerk(perkId: string, creatorId: string) {
  const [row] = await db()
    .select({ perk: perks, tier: tiers })
    .from(perks)
    .innerJoin(tiers, eq(perks.tierId, tiers.id))
    .where(and(eq(perks.id, perkId), eq(tiers.creatorId, creatorId)));
  return row ?? null;
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session.creatorId) {
    return NextResponse.json({ error: "Not a creator" }, { status: 401 });
  }
  const row = await ownedPerk(id, session.creatorId);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db().delete(perks).where(eq(perks.id, id));
  return NextResponse.json({ ok: true });
}
