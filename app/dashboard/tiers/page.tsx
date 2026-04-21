import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db } from "@/lib/db/client";
import { creators, tiers, perks } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { TierEditor } from "./editor";

export default async function TiersPage() {
  const session = await getSession();
  if (!session.wallet) redirect("/dashboard/connect");
  if (!session.creatorId) redirect("/dashboard/onboarding");

  const [creator] = await db()
    .select()
    .from(creators)
    .where(eq(creators.id, session.creatorId));
  if (!creator) redirect("/dashboard/onboarding");

  const creatorTiers = await db()
    .select()
    .from(tiers)
    .where(eq(tiers.creatorId, creator.id))
    .orderBy(tiers.position);

  const allPerks = await db()
    .select()
    .from(perks);

  const perksByTier = new Map<string, typeof allPerks>();
  for (const p of allPerks) {
    const arr = perksByTier.get(p.tierId) ?? [];
    arr.push(p);
    perksByTier.set(p.tierId, arr);
  }

  return (
    <Container size="wide">
      <div className="pt-14 pb-10">
        <div>
          <div
            className="f-label mb-3"
            style={{ color: "var(--ink-faint)" }}
          >
            Tiers · @{creator.handle}
          </div>
          <h1 className="f-display text-[clamp(40px,6vw,72px)]">
            Tiers
          </h1>
          <p
            className="mt-5 f-body text-[17px] max-w-[620px]"
            style={{ color: "var(--ink-soft)" }}
          >
            Each tier is a threshold of{" "}
            <span className="f-mono text-[14px]">
              ${creator.tokenTicker ?? "TOKEN"}
            </span>{" "}
            that unlocks a set of perks. Holders move up when they buy, down
            when they sell — reconciled automatically.
          </p>
        </div>
      </div>

      <div className="rule-h" />

      <div className="py-10">
        <TierEditor
          creatorId={creator.id}
          ticker={creator.tokenTicker ?? "TOKEN"}
          initialTiers={creatorTiers.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            threshold: t.threshold.toString(),
            position: t.position,
            perkCount: perksByTier.get(t.id)?.length ?? 0,
          }))}
        />
      </div>
    </Container>
  );
}
