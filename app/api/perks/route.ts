import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { perks, tiers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { getPlugin } from "@/lib/plugins/registry";
import type { PluginId } from "@/lib/plugins/types";

const bodySchema = z.object({
  tierId: z.string().uuid(),
  pluginId: z.enum(["web", "files", "telegram", "email"]),
  config: z.record(z.unknown()),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.creatorId) {
    return NextResponse.json({ error: "Not a creator" }, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [tier] = await db()
    .select()
    .from(tiers)
    .where(
      and(
        eq(tiers.id, parsed.data.tierId),
        eq(tiers.creatorId, session.creatorId),
      ),
    );
  if (!tier) {
    return NextResponse.json({ error: "Tier not yours" }, { status: 403 });
  }

  const plugin = getPlugin(parsed.data.pluginId as PluginId);
  const cfg = plugin.configSchema.safeParse(parsed.data.config);
  if (!cfg.success) {
    return NextResponse.json(
      { error: cfg.error.issues[0]?.message ?? "Invalid plugin config" },
      { status: 400 },
    );
  }

  const [row] = await db()
    .insert(perks)
    .values({
      tierId: parsed.data.tierId,
      pluginId: parsed.data.pluginId,
      config: cfg.data as Record<string, unknown>,
    })
    .returning();
  return NextResponse.json({ perk: row });
}
