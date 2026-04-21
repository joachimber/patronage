import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, desc, and } from "drizzle-orm";
import { Container } from "@/components/container";
import { db } from "@/lib/db/client";
import {
  creators,
  tiers,
  holders,
  grants,
} from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { shortAddress } from "@/lib/auth/format";

export default async function DashboardHome() {
  const session = await getSession();
  if (!session.wallet) redirect("/dashboard/connect");

  const [creator] = await db()
    .select()
    .from(creators)
    .where(eq(creators.wallet, session.wallet));

  if (!creator) {
    redirect("/dashboard/onboarding");
  }

  const creatorTiers = await db()
    .select()
    .from(tiers)
    .where(eq(tiers.creatorId, creator.id))
    .orderBy(tiers.position);

  const creatorHolders = await db()
    .select()
    .from(holders)
    .where(eq(holders.creatorId, creator.id));

  const activeGrants = await db()
    .select()
    .from(grants)
    .innerJoin(holders, eq(grants.holderId, holders.id))
    .where(
      and(eq(holders.creatorId, creator.id), eq(grants.status, "active")),
    )
    .orderBy(desc(grants.grantedAt))
    .limit(8);

  const countsByTier = new Map<string, number>();
  for (const h of creatorHolders) {
    if (h.currentTierId) {
      countsByTier.set(
        h.currentTierId,
        (countsByTier.get(h.currentTierId) ?? 0) + 1,
      );
    }
  }

  return (
    <Container size="wide">
      <div className="pt-14 pb-10">
        <div
          className="f-label mb-3"
          style={{ color: "var(--ink-faint)" }}
        >
          @{creator.handle}
        </div>
        <h1 className="f-display text-[clamp(40px,6vw,72px)] mb-2">
          {creator.displayName}
        </h1>
        {creator.tagline && (
          <p
            className="f-body text-[18px]"
            style={{ color: "var(--ink-soft)" }}
          >
            {creator.tagline}
          </p>
        )}
      </div>

      <div className="rule-h" />

      <div className="grid grid-cols-12 gap-8 py-10">
        <Stat
          label="Holders"
          value={creatorHolders.length}
          sub="unique wallets"
        />
        <Stat
          label="Tiers"
          value={creatorTiers.length}
          sub="defined"
        />
        <Stat
          label="Active grants"
          value={activeGrants.length}
          sub="plugin assignments"
        />
        <Stat
          label="Token"
          value={creator.tokenTicker ?? "—"}
          sub={creator.tokenMint ? shortAddress(creator.tokenMint) : "not launched"}
          mono={false}
        />
      </div>

      <div className="rule-h" />

      <div className="grid grid-cols-12 gap-10 py-12">
        <section className="col-span-12 md:col-span-7">
          <Header label="Tiers">
            <Link
              href="/dashboard/tiers"
              className="f-label hover:text-vermillion"
              style={{ color: "var(--ink)" }}
            >
              Edit →
            </Link>
          </Header>
          {creatorTiers.length === 0 ? (
            <EmptyRow
              title="You haven't designed any tiers yet."
              href="/dashboard/tiers"
              cta="Open the editor"
            />
          ) : (
            <ul>
              {creatorTiers.map((t, i) => (
                <li key={t.id}>
                  {i > 0 && <div className="rule-h" />}
                  <Link
                    href={`/dashboard/tiers/${t.id}`}
                    className="grid grid-cols-12 gap-4 py-6 group"
                  >
                    <div
                      className="col-span-1 f-mono text-[13px] pt-[2px]"
                      style={{ color: "var(--vermillion)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="col-span-6">
                      <div className="f-headline text-[22px] group-hover:text-vermillion transition-colors">
                        {t.name}
                      </div>
                      {t.description && (
                        <p
                          className="f-body text-[14px] mt-1 line-clamp-1"
                          style={{ color: "var(--ink-soft)" }}
                        >
                          {t.description}
                        </p>
                      )}
                    </div>
                    <div className="col-span-3 f-mono text-[13px] text-right">
                      {formatBig(t.threshold)}{" "}
                      <span style={{ color: "var(--ink-faint)" }}>
                        ${creator.tokenTicker ?? "TOK"}
                      </span>
                    </div>
                    <div
                      className="col-span-2 f-mono text-[12px] text-right"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      {countsByTier.get(t.id) ?? 0} holders
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="col-span-12 md:col-span-4 md:col-start-9">
          <Header label="Recent grants" />
          {activeGrants.length === 0 ? (
            <EmptyRow
              title="No grant activity yet."
              href="/c/alice"
              cta="See demo creator"
            />
          ) : (
            <ul className="space-y-3 mt-2">
              {activeGrants.slice(0, 8).map((g) => (
                <li
                  key={g.grants.id}
                  className="flex items-baseline justify-between gap-4 py-2 border-b border-rule-soft"
                >
                  <div className="flex-1 min-w-0">
                    <div className="f-mono text-[12px] truncate">
                      {shortAddress(g.holders.wallet)}
                    </div>
                    <div
                      className="f-label mt-[2px]"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      {g.grants.pluginId}
                    </div>
                  </div>
                  <div
                    className="f-mono text-[11px]"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    {timeAgo(g.grants.grantedAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <div className="rule-h" />

      <div className="grid grid-cols-12 gap-8 py-12">
        <QuickLink
          n="A"
          title="Launch your token"
          body="Use the Bags SDK to mint $token with partner fee-share already configured."
          href="/dashboard/token"
          cta={creator.tokenMint ? "View launch" : "Launch →"}
        />
        <QuickLink
          n="B"
          title="Design your tiers"
          body="Drag to rank. Inline-edit names and thresholds. Add perks per tier."
          href="/dashboard/tiers"
          cta="Editor →"
        />
        <QuickLink
          n="C"
          title="Share your page"
          body={`Send /c/${creator.handle} to your community. Holders connect a wallet, sign a nonce, and unlock tiers on the spot.`}
          href={`/c/${creator.handle}`}
          cta="Preview →"
        />
      </div>
    </Container>
  );
}

function Header({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="f-label" style={{ color: "var(--ink-faint)" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  mono = true,
}: {
  label: string;
  value: string | number;
  sub?: string;
  mono?: boolean;
}) {
  return (
    <div className="col-span-6 md:col-span-3">
      <div className="f-label mb-2" style={{ color: "var(--ink-faint)" }}>
        {label}
      </div>
      <div
        className={mono ? "f-mono text-[40px] leading-none" : "f-headline text-[32px]"}
      >
        {value}
      </div>
      {sub && (
        <div
          className="f-mono text-[11px] mt-2"
          style={{ color: "var(--ink-faint)" }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function EmptyRow({
  title,
  cta,
  href,
}: {
  title: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="py-6 flex items-baseline justify-between gap-6 border-b border-rule-soft">
      <p className="f-body text-[15px]" style={{ color: "var(--ink-soft)" }}>
        {title}
      </p>
      <Link
        href={href}
        className="f-label hover:text-vermillion whitespace-nowrap"
      >
        {cta}
      </Link>
    </div>
  );
}

function QuickLink({
  n,
  title,
  body,
  href,
  cta,
}: {
  n: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="col-span-12 md:col-span-4 p-7 border border-rule hover:border-ink transition-colors group"
    >
      <div className="flex items-center gap-2 mb-4">
        <span
          className="f-mono text-[11px]"
          style={{ color: "var(--vermillion)" }}
        >
          {n} —
        </span>
        <span className="f-label" style={{ color: "var(--ink-faint)" }}>
          Quick start
        </span>
      </div>
      <div className="f-headline text-[22px]">{title}</div>
      <p
        className="f-body text-[14px] mt-2"
        style={{ color: "var(--ink-soft)" }}
      >
        {body}
      </p>
      <div className="mt-6 f-label group-hover:text-vermillion transition-colors">
        {cta}
      </div>
    </Link>
  );
}

function formatBig(n: bigint | number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const v = typeof n === "bigint" ? n : BigInt(n);
  return v.toLocaleString("en-US");
}

function timeAgo(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const s = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
