import { and, eq } from "drizzle-orm";
import { db } from "./db/client";
import {
  creators,
  grants,
  holders,
  perks,
  tiers,
  type Creator,
  type Holder,
  type Tier,
} from "./db/schema";
import { getPlugin } from "./plugins/registry";

/**
 * The reconcile engine.
 *
 * Given a holder and their current on-chain balance, figure out what tier
 * they should be in, and trigger plugin grant/revoke calls to move them
 * there.
 *
 * This is the ONLY place grant/revoke calls originate. Everything else —
 * the unlock flow, the re-verify cron, manual dashboard actions — funnels
 * through here.
 */

export interface ReconcileResult {
  holderId: string;
  previousTierId: string | null;
  currentTierId: string | null;
  balance: bigint;
  granted: string[];
  revoked: string[];
  errors: Array<{ pluginId: string; error: string }>;
}

export async function reconcile(
  holderId: string,
  balance: bigint,
): Promise<ReconcileResult> {
  const [holder] = await db()
    .select()
    .from(holders)
    .where(eq(holders.id, holderId));
  if (!holder) throw new Error(`Holder ${holderId} not found`);

  const [creator] = await db()
    .select()
    .from(creators)
    .where(eq(creators.id, holder.creatorId));
  if (!creator) throw new Error(`Creator ${holder.creatorId} not found`);

  const allTiers = await db()
    .select()
    .from(tiers)
    .where(eq(tiers.creatorId, creator.id))
    .orderBy(tiers.position);

  // Highest-threshold tier the balance satisfies — tiers come back in
  // ascending position/threshold order.
  const reachable = allTiers.filter((t) => balance >= t.threshold);
  const newTier = reachable[reachable.length - 1] ?? null;

  const previousTierId = holder.currentTierId;
  const currentTierId = newTier?.id ?? null;

  const result: ReconcileResult = {
    holderId: holder.id,
    previousTierId,
    currentTierId,
    balance,
    granted: [],
    revoked: [],
    errors: [],
  };

  // Persist balance + verify-timestamp regardless of tier change.
  await db()
    .update(holders)
    .set({
      lastBalance: balance,
      lastVerifiedAt: new Date(),
      currentTierId,
    })
    .where(eq(holders.id, holder.id));

  if (previousTierId === currentTierId) {
    return result;
  }

  // Revoke previous-tier grants.
  if (previousTierId) {
    const prevTier = allTiers.find((t) => t.id === previousTierId);
    const activeGrants = await db()
      .select()
      .from(grants)
      .where(
        and(
          eq(grants.holderId, holder.id),
          eq(grants.tierId, previousTierId),
          eq(grants.status, "active"),
        ),
      );
    for (const g of activeGrants) {
      try {
        const plugin = getPlugin(g.pluginId);
        if (prevTier && !plugin.comingSoon) {
          await plugin.onRevoke({
            holder: holder as Holder,
            tier: prevTier as Tier,
            creator: creator as Creator,
            externalRef: g.externalRef ?? undefined,
          });
        }
        await db()
          .update(grants)
          .set({ status: "revoked", revokedAt: new Date() })
          .where(eq(grants.id, g.id));
        result.revoked.push(g.pluginId);
      } catch (e) {
        result.errors.push({
          pluginId: g.pluginId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  // Grant new-tier perks.
  if (newTier) {
    const tierPerks = await db()
      .select()
      .from(perks)
      .where(eq(perks.tierId, newTier.id));
    for (const p of tierPerks) {
      try {
        const plugin = getPlugin(p.pluginId);
        if (plugin.comingSoon) continue;
        const { externalRef } = await plugin.onGrant({
          config: p.config,
          holder: holder as Holder,
          tier: newTier as Tier,
          creator: creator as Creator,
        });
        await db().insert(grants).values({
          holderId: holder.id,
          tierId: newTier.id,
          pluginId: p.pluginId,
          externalRef: externalRef ?? null,
          status: "active",
        });
        result.granted.push(p.pluginId);
      } catch (e) {
        result.errors.push({
          pluginId: p.pluginId,
          error: e instanceof Error ? e.message : String(e),
        });
        await db().insert(grants).values({
          holderId: holder.id,
          tierId: newTier.id,
          pluginId: p.pluginId,
          status: "error",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  return result;
}

/**
 * Upsert a holder row for (wallet, creator) and return its id.
 */
export async function ensureHolder(
  wallet: string,
  creatorId: string,
): Promise<string> {
  const [existing] = await db()
    .select()
    .from(holders)
    .where(
      and(eq(holders.wallet, wallet), eq(holders.creatorId, creatorId)),
    );
  if (existing) return existing.id;
  const [created] = await db()
    .insert(holders)
    .values({ wallet, creatorId })
    .returning();
  return created.id;
}
