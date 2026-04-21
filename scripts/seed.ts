/**
 * Seed demo data: Alice (creator) with three tiers + a web-content perk per
 * tier, plus Bob as a holder. Run: npm run seed
 *
 * Does not mint tokens — only populates rows so the app renders something
 * useful without waiting for an on-chain launch. When $ALICE actually
 * launches, we'll rewire the stored mint.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import * as schema from "../lib/db/schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  console.log("→ seeding Patronage demo data");

  const aliceHandle = "alice";
  const [existing] = await db
    .select()
    .from(schema.creators)
    .where(eq(schema.creators.handle, aliceHandle));

  let alice = existing;
  if (!alice) {
    const [created] = await db
      .insert(schema.creators)
      .values({
        handle: aliceHandle,
        displayName: "Alice Underwood",
        tagline: "Experimental folk, recorded on tape.",
        bio:
          "I am a musician working between folk traditions and the tape machines my grandfather left me. Patronage is where I share the parts of the practice that don't make it to streaming.",
        wallet: "Aa11ceDEMOWALLeTnOtOnChAiN00000000000000000",
        tokenMint: null,
        tokenTicker: "ALICE",
        tokenName: "Alice Underwood",
        partnerBps: 100,
        accentColor: "#C1272D",
      })
      .returning();
    alice = created;
    console.log(`  ✓ created creator ${alice.handle} (${alice.id})`);
  } else {
    console.log(`  · creator ${aliceHandle} already exists (${alice.id})`);
  }

  const tierSpecs: Array<{
    name: string;
    description: string;
    threshold: bigint;
    position: number;
    perk: {
      kind: "youtube" | "notion" | "video" | "iframe";
      url: string;
      title: string;
    };
  }> = [
    {
      name: "Fan",
      description:
        "First rung. The unlisted recordings from my desk this month and the note that comes with them.",
      threshold: 100n,
      position: 0,
      perk: {
        kind: "youtube",
        url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
        title: "Demo — 'Me at the zoo' (placeholder; swap to your own)",
      },
    },
    {
      name: "Patron",
      description:
        "Unlisted demo tape — the one I usually don't share. Unreleased lyrics.",
      threshold: 1_000n,
      position: 1,
      perk: {
        kind: "youtube",
        url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
        title: "Unreleased session — Big Buck Bunny (CC placeholder)",
      },
    },
    {
      name: "Muse",
      description:
        "Everything above plus the FLAC stems, handwritten notes, and a once-per-month voice memo.",
      threshold: 10_000n,
      position: 2,
      perk: {
        kind: "youtube",
        url: "https://www.youtube.com/watch?v=eRsGyueVLvQ",
        title: "Muse session — Sintel (CC placeholder)",
      },
    },
  ];

  for (const spec of tierSpecs) {
    const existingTier = await db
      .select()
      .from(schema.tiers)
      .where(eq(schema.tiers.creatorId, alice.id));
    let tierRow = existingTier.find((t) => t.position === spec.position);
    if (tierRow) {
      console.log(`  · tier "${spec.name}" already exists`);
    } else {
      const [inserted] = await db
        .insert(schema.tiers)
        .values({
          creatorId: alice.id,
          name: spec.name,
          description: spec.description,
          threshold: spec.threshold,
          position: spec.position,
        })
        .returning();
      tierRow = inserted;
      console.log(`  ✓ created tier "${spec.name}" @ ${spec.threshold} $ALICE`);
    }

    const existingPerk = await db
      .select()
      .from(schema.perks)
      .where(
        and(eq(schema.perks.tierId, tierRow.id), eq(schema.perks.pluginId, "web")),
      );
    if (existingPerk.length === 0) {
      await db.insert(schema.perks).values({
        tierId: tierRow.id,
        pluginId: "web",
        config: spec.perk,
      });
      console.log(`    ✓ attached web perk: ${spec.perk.title}`);
    } else {
      console.log(`    · web perk already present on "${spec.name}"`);
    }
  }

  const bobWallet = "B0bDEMOholderWALLeTnOtOnChAiN0000000000000000";
  const [bob] = await db
    .select()
    .from(schema.holders)
    .where(eq(schema.holders.wallet, bobWallet));
  if (!bob) {
    await db.insert(schema.holders).values({
      wallet: bobWallet,
      creatorId: alice.id,
      currentTierId: null,
      lastBalance: 0n,
    });
    console.log("  ✓ created demo holder Bob");
  } else {
    console.log("  · demo holder Bob already exists");
  }

  console.log("done.");
  await pool.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
