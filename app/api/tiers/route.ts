import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { creators, tiers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";

const createSchema = z.object({
  name: z.string().trim().min(1).max(64),
  description: z.string().trim().max(2000).optional(),
  threshold: z.string().regex(/^\d+$/).or(z.number().int().min(0)),
  position: z.number().int().min(0).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.wallet || !session.creatorId) {
    return NextResponse.json({ error: "Not a creator" }, { status: 401 });
  }
  const [creator] = await db()
    .select()
    .from(creators)
    .where(eq(creators.id, session.creatorId));
  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const existing = await db()
    .select({ position: tiers.position })
    .from(tiers)
    .where(eq(tiers.creatorId, creator.id));
  const nextPosition =
    parsed.data.position ??
    (existing.reduce((m, t) => Math.max(m, t.position), -1) + 1);

  const threshold =
    typeof parsed.data.threshold === "string"
      ? BigInt(parsed.data.threshold)
      : BigInt(parsed.data.threshold);

  const [tier] = await db()
    .insert(tiers)
    .values({
      creatorId: creator.id,
      name: parsed.data.name,
      description: parsed.data.description,
      threshold,
      position: nextPosition,
    })
    .returning();

  return NextResponse.json({ tier: serializeTier(tier) });
}

const reorderSchema = z.object({
  order: z.array(z.string().uuid()).min(1),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session.creatorId) {
    return NextResponse.json({ error: "Not a creator" }, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const parsed = reorderSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const owned = await db()
    .select({ id: tiers.id })
    .from(tiers)
    .where(eq(tiers.creatorId, session.creatorId));
  const ownedIds = new Set(owned.map((t) => t.id));
  for (const id of parsed.data.order) {
    if (!ownedIds.has(id)) {
      return NextResponse.json({ error: "Tier not yours" }, { status: 403 });
    }
  }

  await Promise.all(
    parsed.data.order.map((id, i) =>
      db().update(tiers).set({ position: i }).where(eq(tiers.id, id)),
    ),
  );
  return NextResponse.json({ ok: true });
}

function serializeTier(t: typeof tiers.$inferSelect) {
  return { ...t, threshold: t.threshold.toString() };
}
