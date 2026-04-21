import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container } from "@/components/container";
import { DiscoverGrid, type DiscoverEntry } from "@/components/discover-grid";
import { TierSimulator } from "@/components/tier-simulator";
import {
  BAGS_MINTS,
  mintTicker,
  mintName,
  shortMint,
  getMintMeta,
  PATRONAGE_MINT_ADDRESS,
} from "@/lib/bags-mints";

export default function Home() {
  return (
    <>
      <Nav />
      <Hero />
      <TokenMarquee />
      <TierSimulator />
      <TwoSides />
      <HowItWorks />
      <Plugins />
      <Discover />
      <Mechanic />
      <EndCTA />
      <Footer />
    </>
  );
}

function Hero() {
  return (
    <section>
      <Container size="wide">
        <div className="pt-20 md:pt-28 pb-16">
          <span className="chip">
            <span
              className="inline-block w-[6px] h-[6px] rounded-full"
              style={{ background: "var(--bags)" }}
            />
            Live · {BAGS_MINTS.length} Bags tokens indexed
          </span>
          <h1 className="f-display text-[clamp(2.8rem,7.5vw,6.4rem)] mt-8 max-w-[18ch]">
            Turn your{" "}
            <span style={{ color: "var(--bags)" }}>Bags</span> token into a
            membership.
          </h1>
          <p
            className="mt-8 f-body text-[19px] md:text-[21px] max-w-[640px]"
            style={{ color: "var(--ink-soft)" }}
          >
            Attach exclusive content, files, and community perks to holding
            thresholds. Holders unlock the moment they buy, lose access the
            moment they sell. Onchain-verified, no logins, no subscriptions.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className="btn btn-bags">
              I&apos;m a creator — claim my page
            </Link>
            <Link href="#discover" className="btn btn-ghost">
              I&apos;m a holder — find my token
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}

function TokenMarquee() {
  // Two rows scrolling in opposite directions for visual density.
  const half = Math.ceil(BAGS_MINTS.length / 2);
  const row1 = BAGS_MINTS.slice(0, half);
  const row2 = BAGS_MINTS.slice(half);
  return (
    <section className="py-10 border-y border-rule bg-bone-warm">
      <div className="mb-4">
        <Container size="wide">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-[8px] h-[8px] rounded-full"
                style={{ background: "var(--bags)" }}
              />
              <span
                className="f-label"
                style={{ color: "var(--ink-faint)" }}
              >
                Every Bags token indexed · click to open
              </span>
            </div>
            <Link
              href="#discover"
              className="f-label hover:text-bags-deep transition-colors"
              style={{ color: "var(--ink)" }}
            >
              See all {BAGS_MINTS.length} →
            </Link>
          </div>
        </Container>
      </div>
      <MarqueeRow mints={row1} />
      <div className="h-3" />
      <MarqueeRow mints={row2} reverse />
    </section>
  );
}

function MarqueeRow({ mints, reverse = false }: { mints: readonly string[]; reverse?: boolean }) {
  // Duplicate the list once so the -50% translate creates a seamless loop.
  const doubled = [...mints, ...mints];
  return (
    <div className="marquee">
      <div className={`marquee-track${reverse ? " reverse" : ""}`}>
        {doubled.map((mint, i) => {
          const meta = getMintMeta(mint);
          const ticker = mintTicker(mint);
          const name = mintName(mint);
          return (
            <Link
              key={`${mint}-${i}`}
              href={`/t/${mint}`}
              className="token-chip"
            >
              {meta?.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={meta.image}
                  alt=""
                  loading="lazy"
                  className="w-9 h-9 rounded-full object-cover shrink-0"
                  style={{ background: "var(--bone-deep)" }}
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center f-label"
                  style={{
                    background: "var(--bags-soft)",
                    color: "var(--bags-deep)",
                  }}
                >
                  {ticker.slice(0, 2)}
                </div>
              )}
              <div className="min-w-0">
                <div className="f-headline text-[13px] leading-none">
                  ${ticker}
                </div>
                <div
                  className="f-body text-[11px] mt-1 leading-none truncate max-w-[14ch]"
                  style={{ color: "var(--ink-soft)" }}
                >
                  {name}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function TwoSides() {
  return (
    <section className="py-24">
      <Container size="wide">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <article className="card p-8 md:p-10">
            <div
              className="f-label"
              style={{ color: "var(--bags-deep)" }}
            >
              For creators
            </div>
            <h2 className="mt-4 f-display text-[clamp(1.6rem,3vw,2.2rem)] max-w-[20ch]">
              Give your holders a reason to stay.
            </h2>
            <p
              className="mt-5 f-body text-[16px] max-w-[44ch]"
              style={{ color: "var(--ink-soft)" }}
            >
              Launch a Patronage page in minutes. Attach gated content, file
              downloads, and community perks to tier thresholds. Your ticker
              becomes the access key — the longer someone holds, the more they
              unlock.
            </p>
            <ul
              className="mt-6 space-y-3 f-body text-[15px]"
              style={{ color: "var(--ink-soft)" }}
            >
              {[
                "No new billing or login — buyers are already your members",
                "Any number of tiers, any threshold in your token",
                "Re-verifies onchain automatically, so selling removes access",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span
                    className="mt-[7px] shrink-0 w-2 h-2 rounded-full"
                    style={{ background: "var(--bags)" }}
                  />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/dashboard" className="btn btn-bags">
                Claim your token page →
              </Link>
            </div>
          </article>

          <article
            className="p-8 md:p-10 rounded-[var(--radius-md)]"
            style={{ background: "var(--ink)", color: "var(--bone)" }}
          >
            <div className="f-label" style={{ color: "var(--bags)" }}>
              For holders
            </div>
            <h2
              className="mt-4 f-display text-[clamp(1.6rem,3vw,2.2rem)] max-w-[20ch]"
              style={{ color: "var(--bone)" }}
            >
              Hold the token. Unlock the work.
            </h2>
            <p
              className="mt-5 f-body text-[16px] max-w-[44ch]"
              style={{ color: "var(--bone-deep)" }}
            >
              Holding a Bags token should give you something real. On
              Patronage, your balance unlocks exclusive content, files, and
              community perks from the creator — checked live whenever you open
              a tier.
            </p>
            <ul
              className="mt-6 space-y-3 f-body text-[15px]"
              style={{ color: "var(--bone-deep)" }}
            >
              {[
                "Connect a wallet, sign once — no account to create",
                "Access follows your holdings across every Patronage page",
                "Creator ships more, you unlock more, nothing to renew",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span
                    className="mt-[7px] shrink-0 w-2 h-2 rounded-full"
                    style={{ background: "var(--bags)" }}
                  />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link
                href="#discover"
                className="btn"
                style={{
                  background: "var(--bags)",
                  color: "var(--ink)",
                }}
              >
                Find your token →
              </Link>
            </div>
          </article>
        </div>
      </Container>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Launch or link a Bags token",
      body: "Launch through our UI in one click, or link an existing mint. Partner config is handled automatically.",
    },
    {
      n: "02",
      title: "Build your tiers",
      body: "Pick thresholds. Attach gated content, file downloads, and community perks. Drag to reorder.",
    },
    {
      n: "03",
      title: "Holders connect and unlock",
      body: "Fans sign once with Phantom. We read their balance via Solana RPC and unlock the right tier — live, not cached.",
    },
  ];

  return (
    <section className="py-24 bg-ink text-bone">
      <Container size="wide">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-4">
            <span className="f-label" style={{ color: "var(--bags)" }}>
              How it works
            </span>
            <h2
              className="mt-4 f-display text-[clamp(2rem,4.5vw,3.4rem)]"
              style={{ color: "var(--bone)" }}
            >
              Three steps from ticker to live perks.
            </h2>
          </div>
          <div className="col-span-12 md:col-span-8 flex flex-col">
            {steps.map((s) => (
              <div
                key={s.n}
                className="grid grid-cols-12 gap-6 py-8 border-t border-rule/25 first:border-t-0"
              >
                <div className="col-span-2">
                  <span
                    className="f-mono text-[14px]"
                    style={{ color: "var(--bags)" }}
                  >
                    {s.n}
                  </span>
                </div>
                <div className="col-span-10">
                  <h3
                    className="f-headline text-[24px]"
                    style={{ color: "var(--bone)" }}
                  >
                    {s.title}
                  </h3>
                  <p
                    className="mt-3 f-body text-[16px] max-w-[560px]"
                    style={{ color: "var(--bone-deep)" }}
                  >
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

function Plugins() {
  const plugins: Array<{
    name: string;
    kind: "live" | "soon";
    tagline: string;
    body: string;
  }> = [
    {
      name: "Web content",
      kind: "live",
      tagline: "Gated embeds",
      body: "Wrap unlisted YouTube, Notion pages, or self-hosted video in a holder-verified frame. Balance is checked server-side on every open.",
    },
    {
      name: "File downloads",
      kind: "live",
      tagline: "Signed downloads",
      body: "Tier-gated downloads. Every click re-reads the holder's onchain balance before streaming — stale links don't exist.",
    },
    {
      name: "Telegram",
      kind: "soon",
      tagline: "Channel invites",
      body: "Revoke-on-sell invite links to a Telegram group or channel. One-click add from the dashboard.",
    },
    {
      name: "Email",
      kind: "soon",
      tagline: "Audience sync",
      body: "Auto-sync holders into a Resend or Substack audience. Revokes when a wallet exits a tier.",
    },
  ];

  return (
    <section className="py-24">
      <Container size="wide">
        <div className="flex items-start justify-between flex-wrap gap-8">
          <div>
            <span className="f-label" style={{ color: "var(--bags-deep)" }}>
              Plugins
            </span>
            <h2 className="mt-4 f-display text-[clamp(2rem,4.5vw,3.4rem)] max-w-[22ch]">
              Ship perks on any surface.
            </h2>
            <p
              className="mt-4 f-body text-[16px] max-w-[52ch]"
              style={{ color: "var(--ink-soft)" }}
            >
              Two plugins live today, two queued. Each one is a single file
              implementing one interface — adding a new surface is a day of
              work, not a rewrite.
            </p>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plugins.map((p) => (
            <article key={p.name} className="card p-6 flex flex-col gap-4 min-h-[260px]">
              <div className="flex items-center justify-between">
                <span className="f-label" style={{ color: "var(--ink-faint)" }}>
                  {p.tagline}
                </span>
                {p.kind === "soon" ? (
                  <span
                    className="f-label px-2 h-5 inline-flex items-center rounded-full"
                    style={{
                      background: "var(--bone-deep)",
                      color: "var(--ink-faint)",
                    }}
                  >
                    Soon
                  </span>
                ) : (
                  <span
                    className="f-label px-2 h-5 inline-flex items-center rounded-full"
                    style={{ background: "var(--bags)", color: "var(--ink)" }}
                  >
                    Live
                  </span>
                )}
              </div>
              <h3 className="f-headline text-[24px]">{p.name}</h3>
              <p
                className="f-body text-[14px]"
                style={{ color: "var(--ink-soft)" }}
              >
                {p.body}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Discover() {
  const entries: DiscoverEntry[] = BAGS_MINTS.map((mint) => ({
    mint,
    ticker: mintTicker(mint),
    name: mintName(mint),
    image: getMintMeta(mint)?.image ?? null,
    short: shortMint(mint, 4, 4),
  }));
  return (
    <section id="discover" className="py-24 bg-bone-warm">
      <Container size="wide">
        <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
          <div>
            <span className="f-label" style={{ color: "var(--bags-deep)" }}>
              Discover
            </span>
            <h2 className="mt-3 f-display text-[clamp(2rem,4.5vw,3.2rem)] max-w-[22ch]">
              {BAGS_MINTS.length} Bags tokens. Open any one.
            </h2>
            <p
              className="mt-4 f-body text-[16px] max-w-[56ch]"
              style={{ color: "var(--ink-soft)" }}
            >
              Holders: find the token you hold and see what the creator is
              offering. Creators: find yours and claim the page in one click.
            </p>
          </div>
        </div>
        <DiscoverGrid entries={entries} />
      </Container>
    </section>
  );
}

function Mechanic() {
  return (
    <section className="py-24">
      <Container size="wide">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-7">
            <span className="f-label" style={{ color: "var(--ink-faint)" }}>
              Fee model
            </span>
            <h2 className="mt-4 f-display text-[clamp(2rem,4.5vw,3.4rem)] max-w-[22ch]">
              An onchain partner config — not a subscription invoice.
            </h2>
            <div
              className="mt-8 max-w-[620px] space-y-4 f-body text-[16px]"
              style={{ color: "var(--ink-soft)" }}
            >
              <p>
                Tokens launched through Patronage carry Patronage as an onchain
                partner. A small basis-point share routes to the treasury — no
                billing, no credit card, auditable on Solscan.
              </p>
              <p>
                Creators who hold enough{" "}
                <Link
                  href={`/t/${PATRONAGE_MINT_ADDRESS}`}
                  className="underline decoration-[var(--bags)] decoration-2 underline-offset-4 hover:text-bags-deep"
                  style={{ color: "var(--ink)" }}
                >
                  $PATRONAGE
                </Link>{" "}
                launch with partner BPS set to zero and keep every basis point
                of their own fee. The utility is encoded in the launch config
                itself, reversible by a sell.
              </p>
            </div>
          </div>
          <aside className="col-span-12 md:col-span-4 md:col-start-9 space-y-4">
            <div
              className="p-5 rounded-[var(--radius-md)]"
              style={{ background: "var(--bags-soft)" }}
            >
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/patronage-token.png"
                  alt=""
                  className="w-[48px] h-[48px] rounded-full object-cover shrink-0"
                  style={{ background: "var(--bone-deep)" }}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="f-label"
                    style={{ color: "var(--bags-deep)" }}
                  >
                    Live on Bags
                  </div>
                  <div className="f-headline text-[20px] mt-[2px]">
                    $PATRONAGE
                  </div>
                  <div
                    className="f-mono text-[11px] mt-[2px] truncate"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {shortMint(PATRONAGE_MINT_ADDRESS, 6, 6)}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <a
                  href={`https://bags.fm/${PATRONAGE_MINT_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-bags flex-1 justify-center"
                >
                  Buy on Bags →
                </a>
                <Link
                  href={`/t/${PATRONAGE_MINT_ADDRESS}`}
                  className="btn btn-ghost flex-1 justify-center"
                >
                  View page
                </Link>
              </div>
            </div>
            <div className="card p-6">
              <dl className="divide-y divide-rule">
                {[
                  ["Partner BPS (default)", "100 bps"],
                  ["Waiver threshold", "10,000 $PATRONAGE"],
                  ["Enforcement", "On-launch config"],
                  ["Audit trail", "Onchain"],
                  ["Billing", "None"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="py-3 flex items-center justify-between"
                  >
                    <dt
                      className="f-label"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      {k}
                    </dt>
                    <dd className="f-mono text-[13px]">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        </div>
      </Container>
    </section>
  );
}

function EndCTA() {
  return (
    <section className="py-28">
      <Container size="wide">
        <div
          className="p-10 md:p-14 flex flex-col md:flex-row md:items-end md:justify-between gap-8 rounded-lg"
          style={{
            background: "var(--ink)",
            color: "var(--bone)",
          }}
        >
          <div className="max-w-[42ch]">
            <span className="f-label" style={{ color: "var(--bags)" }}>
              Ship in ten minutes
            </span>
            <h2
              className="mt-4 f-display text-[clamp(1.8rem,4vw,2.8rem)]"
              style={{ color: "var(--bone)" }}
            >
              Turn your Bags token into a live membership.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn btn-bags">
              Claim your page
            </Link>
            <Link
              href="#discover"
              className="btn"
              style={{
                background: "transparent",
                color: "var(--bone)",
                border: "1px solid var(--bone)",
              }}
            >
              Find a token
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
