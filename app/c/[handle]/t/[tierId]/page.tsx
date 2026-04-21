import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container } from "@/components/container";
import { Seal } from "@/components/seal";
import { db } from "@/lib/db/client";
import { creators, tiers, perks, holders } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { getTokenBalance } from "@/lib/helius";

/**
 * Unlocked tier page — renders the perks for a tier the visitor actually
 * qualifies for. We re-verify server-side on every render: read the signed-in
 * wallet's current balance, confirm it still satisfies this tier's threshold.
 * Revocation therefore happens *at request time* even if our cron hasn't run
 * since the user sold.
 */
export default async function TierPerkPage({
  params,
}: {
  params: Promise<{ handle: string; tierId: string }>;
}) {
  const { handle, tierId } = await params;
  const session = await getSession();
  if (!session.wallet) {
    redirect(`/c/${handle}/unlock`);
  }

  const [creator] = await db()
    .select()
    .from(creators)
    .where(eq(creators.handle, handle));
  if (!creator) notFound();

  const [tier] = await db()
    .select()
    .from(tiers)
    .where(and(eq(tiers.id, tierId), eq(tiers.creatorId, creator.id)));
  if (!tier) notFound();

  const [holder] = await db()
    .select()
    .from(holders)
    .where(
      and(
        eq(holders.wallet, session.wallet),
        eq(holders.creatorId, creator.id),
      ),
    );

  // Render-time re-verification. If the wallet doesn't satisfy the threshold,
  // bounce them to /unlock rather than serving the perk.
  let balance: bigint = holder?.lastBalance ?? 0n;
  let freshFromChain = false;
  if (creator.tokenMint) {
    try {
      balance = await getTokenBalance(session.wallet, creator.tokenMint);
      freshFromChain = true;
    } catch {
      // fall back to stored balance
    }
  }
  if (balance < tier.threshold) {
    redirect(`/c/${handle}/unlock`);
  }

  const tierPerks = await db().select().from(perks).where(eq(perks.tierId, tier.id));
  const accent = creator.accentColor ?? "#C1272D";

  return (
    <>
      <Nav />
      <Container size="wide">
        <div className="pt-14 pb-10">
          <Link
            href={`/c/${creator.handle}`}
            className="f-label hover:text-vermillion mb-6 inline-block"
          >
            ← {creator.displayName}
          </Link>

          <div className="grid grid-cols-12 gap-8 items-start">
            <div className="col-span-12 md:col-span-8">
              <div
                className="f-label mb-3"
                style={{ color: "var(--ink-faint)" }}
              >
                Unlocked · Tier {String(tier.position + 1).padStart(2, "0")}
              </div>
              <h1
                className="f-display text-[clamp(44px,7vw,88px)]"
                style={{ color: accent }}
              >
                {tier.name}
              </h1>
              {tier.description && (
                <p
                  className="mt-5 f-body text-[18px] max-w-[620px]"
                  style={{ color: "var(--ink-soft)" }}
                >
                  {tier.description}
                </p>
              )}
              <p
                className="mt-8 f-mono text-[13px]"
                style={{ color: "var(--ink-faint)" }}
              >
                Re-verified {freshFromChain ? "live from chain" : "from cache"}
                {" · "}
                Balance {balance.toLocaleString()} ${creator.tokenTicker ?? "TOK"}
              </p>
            </div>
            <div className="col-span-12 md:col-span-4 flex justify-end">
              <Seal size={120} accent={accent} label={false} />
            </div>
          </div>
        </div>

        <div className="rule-h" />

        <div className="py-12">
          <div className="f-label mb-6" style={{ color: "var(--ink-faint)" }}>
            Perks
          </div>
          {tierPerks.length === 0 ? (
            <p
              className="f-body text-[15px]"
              style={{ color: "var(--ink-soft)" }}
            >
              No perks attached to this tier yet.
            </p>
          ) : (
            <ul className="space-y-10">
              {tierPerks.map((p) => (
                <li key={p.id}>
                  <PerkBlock
                    pluginId={p.pluginId}
                    config={p.config}
                    accent={accent}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
      <Footer />
    </>
  );
}

function PerkBlock({
  pluginId,
  config,
  accent,
}: {
  pluginId: string;
  config: Record<string, unknown>;
  accent: string;
}) {
  if (pluginId === "web") {
    const kind = (config.kind as string) ?? "iframe";
    const url = config.url as string | undefined;
    if (!url) return null;
    return (
      <div>
        <div className="f-label mb-2" style={{ color: accent }}>
          {kind}
        </div>
        <div
          className="aspect-video border border-rule overflow-hidden"
          style={{ background: "var(--ink)" }}
        >
          <iframe
            src={embedUrl(kind, url)}
            className="w-full h-full"
            allow="autoplay; encrypted-media; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        </div>
        {config.title ? (
          <div
            className="mt-3 f-editorial text-[18px]"
            style={{ color: "var(--ink-soft)" }}
          >
            {config.title as string}
          </div>
        ) : null}
      </div>
    );
  }
  if (pluginId === "files") {
    const fileId = config.fileId as string | undefined;
    if (!fileId) return null;
    const label = (config.label as string) || (config.filename as string) || "Signed download";
    const filename = (config.filename as string) || "file";
    const sizeBytes = typeof config.sizeBytes === "number" ? config.sizeBytes : undefined;
    return (
      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 md:col-span-4">
          <div className="f-label" style={{ color: accent }}>
            File
          </div>
          <div className="f-headline text-[22px] mt-1">{label}</div>
          <div
            className="mt-1 f-mono text-[12px]"
            style={{ color: "var(--ink-faint)" }}
          >
            {filename}
            {sizeBytes ? ` · ${formatBytes(sizeBytes)}` : ""}
          </div>
        </div>
        <div className="col-span-12 md:col-span-8">
          <p className="f-body text-[15px]" style={{ color: "var(--ink-soft)" }}>
            Downloads verify your balance against the tier threshold on every
            click. Sell below and the link stops working.
          </p>
          <a
            href={`/api/files/${fileId}/stream`}
            className="mt-4 f-label inline-flex items-center h-10 px-4 bg-ink text-bone hover:bg-ink-soft transition-colors"
          >
            Download →
          </a>
        </div>
      </div>
    );
  }
  return null;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function embedUrl(kind: string, url: string): string {
  if (kind === "youtube") {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    const id = m?.[1];
    if (id) return `https://www.youtube.com/embed/${id}`;
  }
  return url;
}
