"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type DiscoverEntry = {
  mint: string;
  ticker: string;
  name: string;
  image: string | null;
  short: string;
};

const PAGE_SIZE = 24;

export function DiscoverGrid({ entries }: { entries: DiscoverEntry[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.ticker.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.mint.toLowerCase().includes(q),
    );
  }, [entries, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const start = safePage * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <label className="relative block w-full sm:max-w-[420px]">
          <span className="sr-only">Search tokens</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search by ticker, name, or mint…"
            className="w-full h-12 pl-12 pr-4 rounded-full border bg-bone text-[15px] outline-none focus:border-ink transition-colors"
            style={{ borderColor: "var(--rule)" }}
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
            style={{ color: "var(--ink-faint)" }}
          >
            <circle
              cx="11"
              cy="11"
              r="7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="m16.5 16.5 4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </label>
        <span
          className="f-mono text-[12px]"
          style={{ color: "var(--ink-faint)" }}
        >
          {filtered.length === entries.length
            ? `${entries.length} tokens`
            : `${filtered.length} of ${entries.length}`}
        </span>
      </div>

      {visible.length === 0 ? (
        <div
          className="py-20 text-center f-body text-[15px]"
          style={{ color: "var(--ink-faint)" }}
        >
          No tokens match “{query}”.
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {visible.map((e) => (
            <li key={e.mint}>
              <Link
                href={`/t/${e.mint}`}
                className="card p-4 flex flex-col gap-3 h-full"
              >
                <div className="flex items-start justify-between gap-2">
                  {e.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={e.image}
                      alt=""
                      loading="lazy"
                      className="w-11 h-11 rounded-full object-cover shrink-0"
                      style={{ background: "var(--bone-deep)" }}
                    />
                  ) : (
                    <div
                      className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center f-label"
                      style={{
                        background: "var(--bags-soft)",
                        color: "var(--bags-deep)",
                      }}
                    >
                      {e.ticker.slice(0, 2)}
                    </div>
                  )}
                  <span
                    className="f-label shrink-0"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    Unclaimed
                  </span>
                </div>
                <div className="mt-1">
                  <div className="f-headline text-[16px] truncate">
                    ${e.ticker}
                  </div>
                  <div
                    className="f-body text-[13px] line-clamp-2 mt-1"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {e.name}
                  </div>
                </div>
                <div className="flex-1" />
                <span
                  className="f-mono text-[10px] truncate"
                  style={{ color: "var(--ink-faint)" }}
                >
                  {e.short}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="btn btn-ghost h-10 px-4 text-[13px] disabled:opacity-40 disabled:pointer-events-none"
          >
            ← Prev
          </button>
          <PageNumbers
            current={safePage}
            total={pages}
            onPick={(p) => setPage(p)}
          />
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            disabled={safePage >= pages - 1}
            className="btn btn-ghost h-10 px-4 text-[13px] disabled:opacity-40 disabled:pointer-events-none"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function PageNumbers({
  current,
  total,
  onPick,
}: {
  current: number;
  total: number;
  onPick: (p: number) => void;
}) {
  const pages = buildPageList(current, total);
  return (
    <div className="flex items-center gap-1 mx-1">
      {pages.map((p, i) =>
        p === "…" ? (
          <span
            key={`gap-${i}`}
            className="f-mono text-[12px] px-1"
            style={{ color: "var(--ink-faint)" }}
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPick(p)}
            aria-current={p === current ? "page" : undefined}
            className="f-mono text-[12px] w-9 h-9 rounded-full border transition-colors"
            style={
              p === current
                ? { background: "var(--ink)", color: "var(--bone)", borderColor: "var(--ink)" }
                : { background: "transparent", color: "var(--ink)", borderColor: "var(--rule)" }
            }
          >
            {p + 1}
          </button>
        ),
      )}
    </div>
  );
}

function buildPageList(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const out: Array<number | "…"> = [0];
  const left = Math.max(1, current - 1);
  const right = Math.min(total - 2, current + 1);
  if (left > 1) out.push("…");
  for (let i = left; i <= right; i++) out.push(i);
  if (right < total - 2) out.push("…");
  out.push(total - 1);
  return out;
}
