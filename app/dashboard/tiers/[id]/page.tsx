import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db } from "@/lib/db/client";
import { creators, tiers, perks } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { pluginList } from "@/lib/plugins/registry";
import { PerkPicker } from "./perk-picker";

export default async function TierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session.wallet) redirect("/dashboard/connect");
  if (!session.creatorId) redirect("/dashboard/onboarding");

  const [creator] = await db()
    .select()
    .from(creators)
    .where(eq(creators.id, session.creatorId));
  if (!creator) redirect("/dashboard/onboarding");

  const [tier] = await db()
    .select()
    .from(tiers)
    .where(and(eq(tiers.id, id), eq(tiers.creatorId, creator.id)));
  if (!tier) notFound();

  const tierPerks = await db().select().from(perks).where(eq(perks.tierId, tier.id));

  return (
    <Container size="wide">
      <div className="pt-14 pb-10">
        <Link
          href="/dashboard/tiers"
          className="f-label hover:text-vermillion mb-6 inline-block"
        >
          ← All tiers
        </Link>
        <div className="f-label mb-3" style={{ color: "var(--ink-faint)" }}>
          Tier {String(tier.position + 1).padStart(2, "0")}
        </div>
        <h1 className="f-display text-[clamp(40px,6vw,64px)]">{tier.name}</h1>
        {tier.description && (
          <p
            className="mt-4 f-body text-[17px] max-w-[640px]"
            style={{ color: "var(--ink-soft)" }}
          >
            {tier.description}
          </p>
        )}
        <div className="mt-6 flex items-baseline gap-3">
          <span className="f-label" style={{ color: "var(--ink-faint)" }}>
            Threshold
          </span>
          <span className="f-mono text-[32px] tabular-nums">
            {tier.threshold.toLocaleString()}
          </span>
          <span className="f-mono text-[14px]" style={{ color: "var(--ink-faint)" }}>
            ${creator.tokenTicker ?? "TOKEN"}
          </span>
        </div>
      </div>

      <div className="rule-h" />

      <div className="py-10">
        <PerkPicker
          tierId={tier.id}
          initialPerks={tierPerks.map((p) => ({
            id: p.id,
            pluginId: p.pluginId,
            config: p.config,
          }))}
          plugins={pluginList.map((p) => ({
            id: p.id,
            label: p.label,
            tagline: p.tagline,
            description: p.description,
            comingSoon: !!p.comingSoon,
          }))}
        />
      </div>
    </Container>
  );
}
