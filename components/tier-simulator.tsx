"use client";

import { useMemo, useState } from "react";
import { BAGS_MINTS, getMintMeta, mintTicker } from "@/lib/bags-mints";
import { Container } from "@/components/container";

type PerkKind =
  | "discord"
  | "drop"
  | "video"
  | "voice"
  | "file"
  | "call";

type Tier = {
  id: string;
  name: string;
  threshold: number;
  perks: { kind: PerkKind; label: string }[];
};

const TIERS: Tier[] = [
  {
    id: "fan",
    name: "Fan",
    threshold: 250,
    perks: [
      { kind: "discord", label: "Discord role + #fans channel" },
      { kind: "drop", label: "Drop alerts before public" },
    ],
  },
  {
    id: "patron",
    name: "Patron",
    threshold: 2500,
    perks: [
      { kind: "video", label: "Unlisted video library" },
      { kind: "voice", label: "Weekly voice notes" },
    ],
  },
  {
    id: "muse",
    name: "Muse",
    threshold: 15000,
    perks: [
      { kind: "file", label: "FLAC stems + project files" },
      { kind: "call", label: "Quarterly 1:1 with the creator" },
    ],
  },
];

const MAX = 20000;
const PRESETS = [0, 100, 500, 2500, 10000, 20000];

export function TierSimulator() {
  const options = useMemo(() => {
    const matches: { mint: string; image: string; ticker: string }[] = [];
    for (const mint of BAGS_MINTS) {
      const meta = getMintMeta(mint);
      if (!meta?.image) continue;
      const ticker = mintTicker(mint);
      if (ticker.length > 6) continue;
      matches.push({ mint, image: meta.image, ticker });
      if (matches.length >= 4) break;
    }
    return matches;
  }, []);

  const [active, setActive] = useState(options[0]?.mint ?? "");
  const [balance, setBalance] = useState(1200);
  const selected = options.find((o) => o.mint === active) ?? options[0];
  const pct = Math.min(100, (balance / MAX) * 100);
  const highest = TIERS.reduce(
    (acc, t, i) => (balance >= t.threshold ? i : acc),
    -1,
  );

  return (
    <section className="py-24 bg-bone-warm border-y border-rule">
      <Container size="wide">
        <div className="mb-10 max-w-[68ch]">
          <span className="f-label" style={{ color: "var(--bags-deep)" }}>
            Try it · live
          </span>
          <h2 className="mt-3 f-display text-[clamp(2rem,4.5vw,3.2rem)] max-w-[24ch]">
            Slide the balance. Watch the tiers open.
          </h2>
          <p
            className="mt-4 f-body text-[16px]"
            style={{ color: "var(--ink-soft)" }}
          >
            Every tier is a holding threshold. The moment a wallet crosses
            one, Patronage grants access on every surface at once — Discord
            role, gated content, signed files. Sell back under the threshold
            and access revokes just as fast.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-5">
            <div className="card p-6 md:p-8">
              <div className="f-label" style={{ color: "var(--ink-faint)" }}>
                Your balance in
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {options.map((o) => {
                  const isActive = o.mint === active;
                  return (
                    <button
                      key={o.mint}
                      type="button"
                      onClick={() => setActive(o.mint)}
                      className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition-colors"
                      style={{
                        borderColor: isActive
                          ? "var(--ink)"
                          : "var(--rule)",
                        background: isActive ? "var(--ink)" : "var(--bone)",
                        color: isActive ? "var(--bone)" : "var(--ink)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={o.image}
                        alt=""
                        className="w-6 h-6 rounded-full shrink-0"
                      />
                      <span className="f-headline text-[12px]">
                        ${o.ticker}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-10">
                <div className="flex items-baseline justify-between gap-4">
                  <span
                    className="f-label"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    Holding
                  </span>
                  <span className="f-mono text-[32px] tabular-nums leading-none">
                    {balance.toLocaleString()}
                    <span
                      className="f-body text-[14px] ml-1.5"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      ${selected?.ticker ?? ""}
                    </span>
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={MAX}
                  step={50}
                  value={balance}
                  onChange={(e) => setBalance(Number(e.target.value))}
                  aria-label="Balance"
                  className="sim-slider w-full mt-6"
                  style={{ ["--pct" as string]: `${pct}%` }}
                />

                <div
                  className="flex justify-between mt-3 f-mono text-[11px]"
                  style={{ color: "var(--ink-faint)" }}
                >
                  <span>0</span>
                  <span>20,000</span>
                </div>

                <div className="mt-6 flex gap-1.5 flex-wrap">
                  {PRESETS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setBalance(v)}
                      className="f-mono text-[11px] px-2.5 py-1 rounded-full border transition-colors hover:border-ink"
                      style={{
                        borderColor: "var(--rule)",
                        color: "var(--ink-soft)",
                      }}
                    >
                      {v.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <ul className="flex flex-col gap-3">
              {TIERS.map((t, i) => {
                const unlocked = balance >= t.threshold;
                const isNext = !unlocked && i === highest + 1;
                const need = isNext ? t.threshold - balance : 0;
                return (
                  <li
                    key={t.id}
                    className="sim-tier relative p-6 md:p-7 rounded-[var(--radius-md)] border"
                    data-unlocked={unlocked}
                  >
                    <div className="flex items-start justify-between gap-6 flex-wrap">
                      <div className="flex items-baseline gap-3">
                        <span
                          className="f-mono text-[11px]"
                          style={{ color: "var(--ink-faint)" }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <h3 className="f-headline text-[22px]">{t.name}</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className="f-mono text-[13px] tabular-nums"
                          style={{ color: "var(--ink-soft)" }}
                        >
                          ≥ {t.threshold.toLocaleString()} $
                          {selected?.ticker ?? ""}
                        </span>
                        <span className="sim-state f-label" data-unlocked={unlocked}>
                          {unlocked ? "Unlocked" : "Locked"}
                        </span>
                      </div>
                    </div>

                    <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {t.perks.map((p) => (
                        <li
                          key={p.label}
                          className="sim-perk flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border"
                        >
                          <span className="sim-perk-icon">
                            <PerkIcon kind={p.kind} />
                          </span>
                          <span className="f-body text-[13.5px]">
                            {p.label}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {isNext && (
                      <div
                        className="mt-4 f-mono text-[12px]"
                        style={{ color: "var(--ink-soft)" }}
                      >
                        {need.toLocaleString()} ${selected?.ticker ?? ""} to
                        unlock →
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}

function PerkIcon({ kind }: { kind: PerkKind }) {
  const p = {
    width: 18,
    height: 18,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (kind) {
    case "discord":
      return (
        <svg {...p}>
          <path d="M4 6h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-3 2v-2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
        </svg>
      );
    case "drop":
      return (
        <svg {...p}>
          <path d="M10 3v9" />
          <path d="m6 9 4 4 4-4" />
          <path d="M4 16h12" />
        </svg>
      );
    case "video":
      return (
        <svg {...p}>
          <path d="M3 5h10v10H3z" />
          <path d="m17 6-4 3 4 3z" />
        </svg>
      );
    case "voice":
      return (
        <svg {...p}>
          <circle cx="10" cy="10" r="7" />
          <path d="M7 8v4M10 6v8M13 8v4" />
        </svg>
      );
    case "file":
      return (
        <svg {...p}>
          <path d="M5 3h7l4 4v10H5z" />
          <path d="M12 3v4h4" />
        </svg>
      );
    case "call":
      return (
        <svg {...p}>
          <path d="M4 5h4l2 4-2 1a8 8 0 0 0 4 4l1-2 4 2v4a1 1 0 0 1-1 1A13 13 0 0 1 3 6a1 1 0 0 1 1-1Z" />
        </svg>
      );
  }
}
