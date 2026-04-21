"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";

interface TierRow {
  id: string;
  name: string;
  description: string | null;
  threshold: string;
  position: number;
  perkCount: number;
}

export function TierEditor({
  creatorId: _creatorId,
  ticker,
  initialTiers,
}: {
  creatorId: string;
  ticker: string;
  initialTiers: TierRow[];
}) {
  const router = useRouter();
  const [list, setList] = useState<TierRow[]>(initialTiers);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function addTier() {
    const name = prompt("Tier name (e.g. Patron)");
    if (!name) return;
    const threshold = prompt("Threshold — how many tokens to unlock?", "100");
    if (!threshold) return;
    setCreating(true);
    setErr(null);
    try {
      const res = await fetch("/api/tiers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, threshold }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not create");
      setList((prev) => [
        ...prev,
        {
          id: j.tier.id,
          name: j.tier.name,
          description: j.tier.description ?? null,
          threshold: j.tier.threshold,
          position: j.tier.position,
          perkCount: 0,
        },
      ]);
      startTransition(() => router.refresh());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  async function updateTier(
    id: string,
    patch: { name?: string; threshold?: string; description?: string },
  ) {
    const res = await fetch(`/api/tiers/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "Update failed");
      return;
    }
    setList((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              name: patch.name ?? t.name,
              threshold: patch.threshold ?? t.threshold,
              description: patch.description ?? t.description,
            }
          : t,
      ),
    );
  }

  async function removeTier(id: string) {
    if (!confirm("Delete this tier? Attached perks will be removed.")) return;
    const res = await fetch(`/api/tiers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setErr("Delete failed");
      return;
    }
    setList((prev) => prev.filter((t) => t.id !== id));
    startTransition(() => router.refresh());
  }

  async function persistOrder(next: TierRow[]) {
    const res = await fetch("/api/tiers", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order: next.map((t) => t.id) }),
    });
    if (!res.ok) setErr("Could not save order");
  }

  function onDragStart(i: number) {
    setDragIdx(i);
  }
  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    setList((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(dragIdx, 1);
      copy.splice(i, 0, moved);
      return copy;
    });
    setDragIdx(i);
  }
  function onDragEnd() {
    setDragIdx(null);
    persistOrder(list);
  }

  return (
    <div>
      {err && (
        <div
          className="mb-4 p-3 border f-mono text-[12px]"
          style={{ borderColor: "var(--vermillion)", color: "var(--vermillion)" }}
        >
          {err}
        </div>
      )}

      {list.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-rule">
          <div className="f-label mb-4" style={{ color: "var(--ink-faint)" }}>
            No tiers yet
          </div>
          <p
            className="f-body text-[16px] mb-8 max-w-[420px] mx-auto"
            style={{ color: "var(--ink-soft)" }}
          >
            Start with three tiers — a fan entry, a committed patron level, and
            a top-tier muse. You can refine later.
          </p>
          <Button onClick={addTier} size="lg" disabled={creating}>
            {creating ? "Creating…" : "Add first tier"}
          </Button>
        </div>
      ) : (
        <ul>
          {list.map((t, i) => (
            <li
              key={t.id}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDragEnd={onDragEnd}
              className={`grid grid-cols-12 gap-4 py-6 border-b border-rule-soft group ${dragIdx === i ? "opacity-50" : ""}`}
            >
              <div
                className="col-span-1 flex items-start justify-start pt-[4px] cursor-grab active:cursor-grabbing"
                aria-label="Drag to reorder"
              >
                <span
                  className="f-mono text-[13px]"
                  style={{ color: "var(--ink-faint)" }}
                >
                  ≡
                </span>
                <span
                  className="f-mono text-[13px] ml-2"
                  style={{ color: "var(--vermillion)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="col-span-12 md:col-span-5">
                <InlineText
                  className="f-headline text-[22px]"
                  value={t.name}
                  onCommit={(v) => updateTier(t.id, { name: v })}
                />
                <InlineText
                  className="f-body text-[13px] mt-1"
                  placeholder="Description — what holders of this tier get"
                  value={t.description ?? ""}
                  onCommit={(v) => updateTier(t.id, { description: v })}
                />
              </div>
              <div className="col-span-6 md:col-span-3">
                <InlineText
                  className="f-mono text-[16px] text-right tabular-nums"
                  value={t.threshold}
                  numeric
                  onCommit={(v) =>
                    updateTier(t.id, {
                      threshold: v.replace(/[^0-9]/g, "") || "0",
                    })
                  }
                />
                <div
                  className="text-right f-mono text-[11px] mt-1"
                  style={{ color: "var(--ink-faint)" }}
                >
                  ${ticker}
                </div>
              </div>
              <div className="col-span-6 md:col-span-3 flex items-start justify-end gap-4">
                <Link
                  href={`/dashboard/tiers/${t.id}`}
                  className="f-label hover:text-vermillion"
                >
                  {t.perkCount} perk{t.perkCount === 1 ? "" : "s"} →
                </Link>
                <button
                  onClick={() => removeTier(t.id)}
                  className="f-label opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--vermillion)" }}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {list.length > 0 && (
        <div className="pt-8">
          <Button variant="outline" onClick={addTier} disabled={creating}>
            {creating ? "Creating…" : "+ Add tier"}
          </Button>
        </div>
      )}
    </div>
  );
}

function InlineText({
  value,
  onCommit,
  className,
  placeholder,
  numeric,
}: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
  placeholder?: string;
  numeric?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className={`${className} w-full text-left bg-transparent border-b border-transparent hover:border-rule transition-colors`}
        style={{ color: value ? undefined : "var(--ink-faint)" }}
      >
        {value || placeholder || "—"}
      </button>
    );
  }
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (draft !== value) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      inputMode={numeric ? "numeric" : undefined}
      className={`${className} w-full bg-transparent border-b border-vermillion outline-none`}
    />
  );
}
