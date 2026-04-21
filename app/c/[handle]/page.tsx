import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container } from "@/components/container";
import { Seal } from "@/components/seal";
import { db } from "@/lib/db/client";
import { creators, tiers, perks } from "@/lib/db/schema";
import { shortAddress } from "@/lib/auth/format";

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  const [creator] = await db()
    .select()
    .from(creators)
    .where(eq(creators.handle, handle));
  if (!creator) notFound();

  const creatorTiers = await db()
    .select()
    .from(tiers)
    .where(eq(tiers.creatorId, creator.id))
    .orderBy(tiers.position);

  const allPerks = await db().select().from(perks);
  const perksByTier = new Map<string, typeof allPerks>();
  for (const p of allPerks) {
    const arr = perksByTier.get(p.tierId) ?? [];
    arr.push(p);
    perksByTier.set(p.tierId, arr);
  }

  const accent = creator.accentColor ?? "#C1272D";

  return (
    <>
      <Nav />
      <Container size="wide">
        <div className="pt-16 pb-10">
          <div
            className="f-label mb-4"
            style={{ color: "var(--ink-faint)" }}
          >
            @{creator.handle}
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 md:col-span-8">
              <h1 className="f-display text-[clamp(44px,8vw,96px)]">
                {creator.displayName}
              </h1>
              {creator.tagline && (
                <p
                  className="mt-5 f-editorial text-[22px] max-w-[640px]"
                  style={{ color: "var(--ink-soft)" }}
                >
                  {creator.tagline}
                </p>
              )}
              {creator.bio && (
                <p
                  className="mt-8 f-body text-[17px] max-w-[620px]"
                  style={{ color: "var(--ink-soft)" }}
                >
                  {creator.bio}
                </p>
              )}
              <div className="mt-10 flex items-center gap-4">
                <Link
                  href={`/c/${creator.handle}/unlock`}
                  className="f-label inline-flex items-center h-12 px-7"
                  style={{ background: accent, color: "var(--bone)" }}
                >
                  Unlock your tier →
                </Link>
                {creator.tokenMint && (
                  <a
                    href={`https://bags.fm/token/${creator.tokenMint}`}
                    target="_blank"
                    rel="noreferrer"
                    className="f-label inline-flex items-center h-12 px-5 border border-ink hover:bg-ink hover:text-bone transition-colors"
                  >
                    Buy ${creator.tokenTicker ?? "TOKEN"} on Bags →
                  </a>
                )}
              </div>
            </div>
            <div className="col-span-12 md:col-span-4 relative">
              <div className="seal-in">
                <Seal size={120} label accent={accent} />
              </div>
              {creator.tokenMint && (
                <div
                  className="mt-8 border-t border-rule pt-6 f-mono text-[12px] space-y-2"
                  style={{ color: "var(--ink-soft)" }}
                >
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                    <dt className="f-label" style={{ color: "var(--ink-faint)" }}>
                      Ticker
                    </dt>
                    <dd>${creator.tokenTicker ?? "—"}</dd>
                    <dt className="f-label" style={{ color: "var(--ink-faint)" }}>
                      Mint
                    </dt>
                    <dd className="truncate">
                      {shortAddress(creator.tokenMint, 6)}
                    </dd>
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rule-h" />

        <div className="grid grid-cols-12 gap-10 py-14">
          <div className="col-span-12 md:col-span-4 md:sticky md:top-24 h-fit">
            <div
              className="f-label mb-3"
              style={{ color: "var(--ink-faint)" }}
            >
              Tiers
            </div>
            <h2 className="f-display text-[32px]">
              Hold ${creator.tokenTicker ?? "TOKEN"} to unlock.
            </h2>
            <p
              className="mt-5 f-body text-[15px] max-w-[320px]"
              style={{ color: "var(--ink-soft)" }}
            >
              Each tier requires a minimum balance. Sell below and access
              revokes the next time we re-verify.
            </p>
          </div>

          <div className="col-span-12 md:col-span-8">
            {creatorTiers.length === 0 ? (
              <div className="py-20 border border-dashed border-rule text-center">
                <p
                  className="f-body text-[16px]"
                  style={{ color: "var(--ink-soft)" }}
                >
                  No tiers yet. The studio is warming up.
                </p>
              </div>
            ) : (
              <ul className="space-y-0">
                {creatorTiers.map((t, i) => (
                  <li key={t.id}>
                    {i > 0 && <div className="rule-h" />}
                    <article className="grid grid-cols-12 gap-4 py-10">
                      <div className="col-span-2">
                        <div
                          className="f-mono text-[13px]"
                          style={{ color: accent }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </div>
                        <div
                          className="f-label mt-2"
                          style={{ color: "var(--ink-faint)" }}
                        >
                          Tier
                        </div>
                      </div>
                      <div className="col-span-10 md:col-span-7">
                        <h3 className="f-headline text-[32px]">{t.name}</h3>
                        {t.description && (
                          <p
                            className="mt-3 f-body text-[16px]"
                            style={{ color: "var(--ink-soft)" }}
                          >
                            {t.description}
                          </p>
                        )}
                        <ul className="mt-5 flex flex-wrap gap-2">
                          {(perksByTier.get(t.id) ?? []).map((p) => (
                            <li
                              key={p.id}
                              className="f-label px-3 h-7 inline-flex items-center border border-rule"
                            >
                              {p.pluginId}
                            </li>
                          ))}
                          {(!perksByTier.get(t.id) ||
                            perksByTier.get(t.id)!.length === 0) && (
                            <li
                              className="f-label"
                              style={{ color: "var(--ink-faint)" }}
                            >
                              —
                            </li>
                          )}
                        </ul>
                      </div>
                      <div className="col-span-12 md:col-span-3 text-right">
                        <div
                          className="f-mono text-[28px] tabular-nums"
                          style={{ color: "var(--ink)" }}
                        >
                          {t.threshold.toLocaleString()}
                        </div>
                        <div
                          className="f-mono text-[12px] mt-1"
                          style={{ color: "var(--ink-faint)" }}
                        >
                          ${creator.tokenTicker ?? "TOKEN"}
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Container>
      <Footer />
    </>
  );
}
