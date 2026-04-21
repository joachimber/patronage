import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container } from "@/components/container";
import { Seal } from "@/components/seal";
import { db } from "@/lib/db/client";
import { creators, tiers, perks } from "@/lib/db/schema";
import {
  shortMint,
  isLikelySolanaMint,
  mintTicker,
  mintName,
  getMintMeta,
} from "@/lib/bags-mints";
import { getAssetMetadata } from "@/lib/helius";

export default async function TokenPage({
  params,
}: {
  params: Promise<{ mint: string }>;
}) {
  const { mint } = await params;

  if (!isLikelySolanaMint(mint)) notFound();

  const [creator] = await db()
    .select()
    .from(creators)
    .where(eq(creators.tokenMint, mint));

  if (creator) {
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
    return (
      <ClaimedView
        mint={mint}
        creator={creator}
        tiers={creatorTiers.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          threshold: t.threshold.toString(),
          perks: (perksByTier.get(t.id) ?? []).map((p) => p.pluginId),
        }))}
      />
    );
  }

  const seed = getMintMeta(mint);
  let live: { name: string | null; symbol: string | null; image: string | null; description: string | null } | null = null;
  if (!seed) {
    live = await getAssetMetadata(mint).catch(() => null);
  }
  const name = seed?.name?.trim() || live?.name || mintName(mint);
  const ticker = (seed?.symbol?.trim() || live?.symbol || mintTicker(mint)).toUpperCase();
  const image = seed?.image || live?.image || null;
  const description = seed?.description?.trim() || live?.description || null;

  return (
    <UnclaimedView
      mint={mint}
      name={name}
      ticker={ticker}
      image={image}
      description={description}
    />
  );
}

function ClaimedView({
  mint,
  creator,
  tiers,
}: {
  mint: string;
  creator: {
    handle: string;
    displayName: string;
    tagline: string | null;
    bio: string | null;
    tokenTicker: string | null;
    accentColor: string | null;
  };
  tiers: Array<{
    id: string;
    name: string;
    description: string | null;
    threshold: string;
    perks: string[];
  }>;
}) {
  const accent = creator.accentColor ?? "var(--bags)";
  return (
    <>
      <Nav />
      <Container size="wide">
        <div className="pt-16 pb-10">
          <div className="flex items-center gap-2 mb-6">
            <span className="chip">
              <span
                className="inline-block w-[6px] h-[6px] rounded-full"
                style={{ background: "var(--bags-deep)" }}
              />
              Claimed
            </span>
            <span className="f-mono text-[11px]" style={{ color: "var(--ink-faint)" }}>
              {shortMint(mint, 6, 6)}
            </span>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 md:col-span-8">
              <h1 className="f-display text-[clamp(44px,8vw,88px)]">
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
                  className="mt-6 f-body text-[16px] max-w-[620px]"
                  style={{ color: "var(--ink-soft)" }}
                >
                  {creator.bio}
                </p>
              )}
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link href={`/c/${creator.handle}/unlock`} className="btn btn-bags">
                  Unlock your tier →
                </Link>
                <a
                  href={`https://bags.fm/${mint}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost"
                >
                  Buy ${creator.tokenTicker ?? "TOKEN"} on Bags →
                </a>
              </div>
            </div>
            <div className="col-span-12 md:col-span-4 relative">
              <div className="seal-in">
                <Seal size={120} label accent={accent} />
              </div>
            </div>
          </div>
        </div>

        <div className="rule-h" />

        <div className="grid grid-cols-12 gap-10 py-14">
          <div className="col-span-12 md:col-span-4 md:sticky md:top-24 h-fit">
            <div className="f-label mb-3" style={{ color: "var(--ink-faint)" }}>
              Tiers
            </div>
            <h2 className="f-display text-[32px]">
              Hold ${creator.tokenTicker ?? "TOKEN"} to unlock.
            </h2>
            <p
              className="mt-4 f-body text-[15px] max-w-[320px]"
              style={{ color: "var(--ink-soft)" }}
            >
              Each tier requires a minimum balance. Balance is re-read from
              Solana whenever you open a tier or download a file.
            </p>
          </div>
          <div className="col-span-12 md:col-span-8">
            {tiers.length === 0 ? (
              <div className="py-16 border border-dashed border-rule text-center rounded-lg">
                <p className="f-body text-[16px]" style={{ color: "var(--ink-soft)" }}>
                  No tiers published yet.
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {tiers.map((t, i) => (
                  <li key={t.id} className="card p-6">
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1">
                        <div
                          className="f-mono text-[12px]"
                          style={{ color: accent }}
                        >
                          T{String(i + 1).padStart(2, "0")}
                        </div>
                        <h3 className="f-headline text-[26px] mt-1">{t.name}</h3>
                        {t.description && (
                          <p
                            className="mt-2 f-body text-[15px]"
                            style={{ color: "var(--ink-soft)" }}
                          >
                            {t.description}
                          </p>
                        )}
                        <ul className="mt-4 flex flex-wrap gap-2">
                          {t.perks.length === 0 ? (
                            <li
                              className="f-label"
                              style={{ color: "var(--ink-faint)" }}
                            >
                              —
                            </li>
                          ) : (
                            t.perks.map((p, j) => (
                              <li
                                key={`${t.id}-${j}`}
                                className="f-label px-3 h-7 inline-flex items-center rounded-full border border-rule"
                              >
                                {p}
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="f-mono text-[28px] tabular-nums">
                          {Number(t.threshold).toLocaleString()}
                        </div>
                        <div
                          className="f-mono text-[12px] mt-1"
                          style={{ color: "var(--ink-faint)" }}
                        >
                          ${creator.tokenTicker ?? "TOKEN"}
                        </div>
                      </div>
                    </div>
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

function UnclaimedView({
  mint,
  name,
  ticker,
  image,
  description,
}: {
  mint: string;
  name: string;
  ticker: string;
  image: string | null;
  description: string | null;
}) {
  return (
    <>
      <Nav />
      <Container size="wide">
        <div className="pt-14 pb-10">
          <div className="flex items-center gap-3 mb-6">
            <span
              className="chip"
              style={{
                background: "var(--bone-warm)",
                color: "var(--ink-faint)",
              }}
            >
              <span
                className="inline-block w-[6px] h-[6px] rounded-full"
                style={{ background: "var(--ink-faint)" }}
              />
              Unclaimed
            </span>
            <span
              className="f-mono text-[11px]"
              style={{ color: "var(--ink-faint)" }}
            >
              {shortMint(mint, 6, 6)}
            </span>
          </div>

          <div className="grid grid-cols-12 gap-8 items-start">
            <div className="col-span-12 md:col-span-8">
              <div className="flex items-center gap-5">
                {image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={image}
                    alt=""
                    className="w-[72px] h-[72px] rounded-full object-cover shrink-0"
                    style={{ background: "var(--bone-deep)" }}
                  />
                ) : (
                  <div
                    className="w-[72px] h-[72px] rounded-full shrink-0 flex items-center justify-center f-display text-[24px]"
                    style={{
                      background: "var(--bags-soft)",
                      color: "var(--bags-deep)",
                    }}
                  >
                    {ticker.slice(0, 2)}
                  </div>
                )}
                <div>
                  <div
                    className="f-label"
                    style={{ color: "var(--bags-deep)" }}
                  >
                    ${ticker}
                  </div>
                  <div
                    className="f-body text-[14px] mt-1"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    Bags token
                  </div>
                </div>
              </div>
              <h1 className="mt-8 f-display text-[clamp(40px,6.8vw,76px)] max-w-[18ch]">
                {name}
              </h1>
              <p
                className="mt-6 f-body text-[18px] max-w-[640px]"
                style={{ color: "var(--ink-soft)" }}
              >
                {description
                  ? description
                  : `${name} is a Bags token. It doesn't have a Patronage membership yet — once claimed, the creator can attach gated content, files, and community perks to tiers that unlock by holding $${ticker}.`}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href={`/dashboard/onboarding?mint=${mint}`}
                  className="btn btn-bags"
                >
                  Claim as the creator →
                </Link>
                <a
                  href={`https://bags.fm/${mint}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost"
                >
                  Buy ${ticker} on Bags →
                </a>
              </div>
              <div
                className="mt-10 border-t border-rule pt-6 f-mono text-[12px]"
                style={{ color: "var(--ink-soft)" }}
              >
                <div
                  className="f-label mb-2"
                  style={{ color: "var(--ink-faint)" }}
                >
                  Mint address
                </div>
                <code className="break-all">{mint}</code>
              </div>
            </div>
            <div className="col-span-12 md:col-span-4 grid gap-4">
              <div
                className="p-6 rounded-[var(--radius-md)] rise"
                style={{ background: "var(--bags-soft)" }}
              >
                <div
                  className="f-label"
                  style={{ color: "var(--bags-deep)" }}
                >
                  If you&apos;re the creator
                </div>
                <p
                  className="mt-4 f-body text-[14px]"
                  style={{ color: "var(--ink)" }}
                >
                  Claim this page to turn ${ticker} into a live membership.
                  Connect the fee-claimer wallet, set thresholds, attach perks
                  — takes about ten minutes.
                </p>
              </div>
              <div
                className="p-6 rounded-[var(--radius-md)] rise"
                style={{ background: "var(--ink)", color: "var(--bone)" }}
              >
                <div
                  className="f-label"
                  style={{ color: "var(--bags)" }}
                >
                  If you&apos;re a holder
                </div>
                <p
                  className="mt-4 f-body text-[14px]"
                  style={{ color: "var(--bone-deep)" }}
                >
                  The creator hasn&apos;t set up perks yet. Buy ${ticker} on
                  Bags now and everything the creator ships through Patronage
                  will unlock the moment they claim.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rule-h" />

        <section className="py-14">
          <div className="flex items-baseline justify-between gap-6 mb-8">
            <div>
              <span
                className="f-label"
                style={{ color: "var(--ink-faint)" }}
              >
                Sample tiers
              </span>
              <h2 className="mt-3 f-display text-[clamp(1.8rem,3.4vw,2.4rem)]">
                What a ${ticker} membership could look like.
              </h2>
              <p
                className="mt-3 f-body text-[15px] max-w-[56ch]"
                style={{ color: "var(--ink-soft)" }}
              >
                A placeholder structure the creator can rewrite after claiming.
                Holders will unlock the matching tier automatically based on
                their ${ticker} balance.
              </p>
            </div>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SAMPLE_TIERS.map((t, i) => (
              <li key={t.name} className="card p-6">
                <div
                  className="f-mono text-[12px]"
                  style={{ color: "var(--bags-deep)" }}
                >
                  T{String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="f-headline text-[22px] mt-1">{t.name}</h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="f-mono text-[28px] tabular-nums">
                    {t.threshold.toLocaleString()}
                  </span>
                  <span
                    className="f-mono text-[12px]"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    ${ticker}
                  </span>
                </div>
                <p
                  className="mt-4 f-body text-[14px]"
                  style={{ color: "var(--ink-soft)" }}
                >
                  {t.body}
                </p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {t.perks.map((p) => (
                    <li
                      key={p}
                      className="f-label px-3 h-7 inline-flex items-center rounded-full border border-rule"
                      style={{ color: "var(--ink-soft)" }}
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      </Container>
      <Footer />
    </>
  );
}

const SAMPLE_TIERS: Array<{
  name: string;
  threshold: number;
  body: string;
  perks: string[];
}> = [
  {
    name: "Supporter",
    threshold: 100,
    body: "First rung. Unlisted posts, behind-the-scenes, a thank-you note from the creator.",
    perks: ["gated post", "voice memo"],
  },
  {
    name: "Collector",
    threshold: 1000,
    body: "Everything above plus unreleased work, high-res downloads, and process files.",
    perks: ["gated video", "signed download"],
  },
  {
    name: "Patron",
    threshold: 10000,
    body: "The full archive. Private group access, stems, source files, monthly voice notes.",
    perks: ["everything", "group access"],
  },
];
