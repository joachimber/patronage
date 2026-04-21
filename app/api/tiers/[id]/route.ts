import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { tiers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(64).optional(),
  description: z.string().trim().max(2000).optional(),
  threshold: z.string().regex(/^\d+$/).optional(),
});

async function ownedTier(tierId: string, creatorId: string) {
  const [t] = await db()
    .select()
    .from(tiers)
    .where(and(eq(tiers.id, tierId), eq(tiers.creatorId, creatorId)));
  return t ?? null;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session.creatorId) {
    return NextResponse.json({ error: "Not a creator" }, { status: 401 });
  }
  const t = await ownedTier(id, session.creatorId);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const patch: Partial<typeof tiers.$inferInsert> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined)
    patch.description = parsed.data.description;
  if (parsed.data.threshold !== undefined)
    patch.threshold = BigInt(parsed.data.threshold);

  const [updated] = await db()
    .update(tiers)
    .set(patch)
    .where(eq(tiers.id, id))
    .returning();

  return NextResponse.json({
    tier: { ...updated, threshold: updated.threshold.toString() },
  });
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
  const t = await ownedTier(id, session.creatorId);
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db().delete(tiers).where(eq(tiers.id, id));
  return NextResponse.json({ ok: true });
}
