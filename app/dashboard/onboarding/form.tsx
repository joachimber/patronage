"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";

interface Initial {
  handle: string;
  displayName: string;
  tagline: string;
  bio: string;
  accentColor: string;
}

export function OnboardingForm({
  initial,
  linkMint,
  linkTicker,
}: {
  initial?: Initial;
  linkMint?: string | null;
  linkTicker?: string | null;
}) {
  const router = useRouter();
  const [handle, setHandle] = useState(initial?.handle ?? "");
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [tagline, setTagline] = useState(initial?.tagline ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [accentColor, setAccentColor] = useState(
    initial?.accentColor ?? "#C1272D",
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/creators", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          handle: handle.toLowerCase(),
          displayName,
          tagline: tagline || undefined,
          bio: bio || undefined,
          accentColor,
          tokenMint: linkMint || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not save");
      router.push(linkMint ? "/dashboard/tiers" : "/dashboard/token");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      <Field
        label="Handle"
        hint="Lowercase letters, numbers, dash. Your public URL: /c/HANDLE."
      >
        <div className="flex items-baseline gap-2">
          <span className="f-mono text-[16px]" style={{ color: "var(--ink-faint)" }}>
            /c/
          </span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            required
            minLength={3}
            maxLength={64}
            placeholder="alice"
            className="flex-1 bg-transparent border-0 border-b border-ink outline-none py-2 f-mono text-[20px] focus:border-vermillion"
          />
        </div>
      </Field>

      <Field label="Display name" hint="As it appears at the top of your page.">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          maxLength={120}
          placeholder="Alice Underwood"
          className="w-full bg-transparent border-0 border-b border-ink outline-none py-2 f-headline text-[28px] focus:border-vermillion"
        />
      </Field>

      <Field
        label="Tagline"
        hint="One line. A pull quote. What the studio is for."
      >
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={240}
          placeholder="Experimental folk, recorded on tape."
          className="w-full bg-transparent border-0 border-b border-ink outline-none py-2 f-editorial text-[22px] focus:border-vermillion"
          style={{ fontStyle: "italic" }}
        />
      </Field>

      <Field label="Bio" hint="Optional. A paragraph.">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="I am a musician working between folk traditions and the tape machines my grandfather left me."
          className="w-full bg-transparent border border-rule outline-none p-4 f-body text-[15px] focus:border-vermillion resize-none"
        />
      </Field>

      <Field label="Accent color" hint="Used on your public page. We recommend warm, committed tones.">
        <div className="flex items-center gap-4">
          <input
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            className="w-14 h-14 cursor-pointer bg-transparent border border-rule p-0"
          />
          <span className="f-mono text-[14px]">{accentColor.toUpperCase()}</span>
          <div className="flex gap-2 ml-auto">
            {["#C1272D", "#B08E3C", "#2A2824", "#1E5F4E", "#3C4E7A"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAccentColor(c)}
                className="w-6 h-6 border border-rule hover:border-ink"
                style={{ background: c }}
                aria-label={`Pick ${c}`}
              />
            ))}
          </div>
        </div>
      </Field>

      {err && (
        <p
          className="f-mono text-[12px]"
          style={{ color: "var(--vermillion)" }}
        >
          {err}
        </p>
      )}

      <div className="flex items-center gap-4 pt-4">
        <Button type="submit" variant="ink" size="lg" disabled={busy}>
          {busy ? "Saving…" : linkMint ? `Claim $${linkTicker ?? "TOKEN"} & continue` : "Save & continue"}
        </Button>
        <span
          className="f-mono text-[12px]"
          style={{ color: "var(--ink-faint)" }}
        >
          {linkMint ? "Next: build your tiers" : "Next: launch your token"}
        </span>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="f-label" style={{ color: "var(--ink-faint)" }}>
          {label}
        </label>
        {hint && (
          <span
            className="f-mono text-[11px]"
            style={{ color: "var(--ink-faint)" }}
          >
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
