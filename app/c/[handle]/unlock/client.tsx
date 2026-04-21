"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { connectWallet, shortAddress, signIn } from "@/lib/auth/client";
import { Button } from "@/components/button";
import { Seal } from "@/components/seal";

interface TierView {
  id: string;
  name: string;
  threshold: string;
  position: number;
}

interface InitialHolder {
  balance: string;
  currentTierId: string | null;
  currentTierName: string | null;
}

type Phase =
  | { kind: "idle" }
  | { kind: "connecting" }
  | { kind: "verifying" }
  | {
      kind: "verified";
      balance: string;
      currentTierId: string | null;
      currentTierName: string | null;
      granted: string[];
      revoked: string[];
      errors: Array<{ pluginId: string; error: string }>;
    }
  | { kind: "error"; message: string };

export function UnlockClient({
  handle,
  tokenTicker,
  tokenMint,
  accentColor,
  initialHolder,
  signedInWallet,
  tiers,
}: {
  handle: string;
  tokenTicker: string;
  tokenMint: string | null;
  accentColor: string;
  initialHolder: InitialHolder | null;
  signedInWallet: string | null;
  tiers: TierView[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [wallet, setWallet] = useState<string | null>(signedInWallet);
  const [phase, setPhase] = useState<Phase>(
    initialHolder
      ? {
          kind: "verified",
          balance: initialHolder.balance,
          currentTierId: initialHolder.currentTierId,
          currentTierName: initialHolder.currentTierName,
          granted: [],
          revoked: [],
          errors: [],
        }
      : { kind: "idle" },
  );

  async function onConnect() {
    setPhase({ kind: "connecting" });
    try {
      const w = await connectWallet();
      await signIn(w);
      setWallet(w);
      await verify(w);
    } catch (e) {
      setPhase({
        kind: "error",
        message: e instanceof Error ? e.message : "Could not connect",
      });
    }
  }

  async function verify(currentWallet: string | null = wallet) {
    if (!currentWallet) return;
    if (!tokenMint) {
      setPhase({
        kind: "error",
        message:
          "This creator hasn't launched their token yet. Come back after they launch on Bags.",
      });
      return;
    }
    setPhase({ kind: "verifying" });
    try {
      const res = await fetch("/api/holders/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Verify failed");
      setPhase({
        kind: "verified",
        balance: j.balance,
        currentTierId: j.currentTierId,
        currentTierName: j.currentTierName,
        granted: j.granted,
        revoked: j.revoked,
        errors: j.errors,
      });
      startTransition(() => router.refresh());
    } catch (e) {
      setPhase({
        kind: "error",
        message: e instanceof Error ? e.message : "Verify failed",
      });
    }
  }

  return (
    <div className="grid grid-cols-12 gap-10">
      <section className="col-span-12 md:col-span-7">
        {phase.kind === "idle" && !wallet && (
          <div className="border border-rule p-8">
            <div className="f-label mb-3" style={{ color: "var(--ink-faint)" }}>
              Step 01 · Connect
            </div>
            <h3 className="f-headline text-[32px]">
              Connect Phantom or Solflare.
            </h3>
            <p
              className="mt-3 f-body text-[15px]"
              style={{ color: "var(--ink-soft)" }}
            >
              We sign a nonce to prove you own the wallet. No approval, no
              transaction.
            </p>
            <div className="mt-6">
              <Button onClick={onConnect} variant="ink" size="lg">
                Connect wallet
              </Button>
            </div>
          </div>
        )}

        {phase.kind === "connecting" && (
          <StatusCard label="Connecting" body="Check your wallet extension to approve." />
        )}
        {phase.kind === "verifying" && (
          <StatusCard
            label="Verifying"
            body={`Reading your ${tokenTicker} balance from Solana…`}
          />
        )}

        {phase.kind === "error" && (
          <div className="border border-vermillion p-8">
            <div
              className="f-label mb-2"
              style={{ color: "var(--vermillion)" }}
            >
              Error
            </div>
            <p className="f-body text-[15px]">{phase.message}</p>
            <div className="mt-6 flex gap-3">
              <Button onClick={() => wallet && verify(wallet)} variant="ink" size="sm">
                Try again
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPhase({ kind: "idle" })}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {phase.kind === "verified" && (
          <div className="border border-rule p-8 relative">
            <div className="absolute -top-[1px] -left-[1px] -right-[1px] rule-thick" />
            <div
              className="f-label mb-2"
              style={{ color: "var(--ink-faint)" }}
            >
              Verified on-chain
            </div>
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="f-mono text-[48px] tabular-nums leading-none">
                  {formatBalance(phase.balance)}
                </div>
                <div
                  className="f-mono text-[13px] mt-2"
                  style={{ color: "var(--ink-faint)" }}
                >
                  ${tokenTicker} · {wallet ? shortAddress(wallet) : ""}
                </div>
              </div>
              {phase.currentTierName && (
                <Seal size={72} label={false} accent={accentColor} />
              )}
            </div>

            <div className="mt-8">
              {phase.currentTierName ? (
                <>
                  <div
                    className="f-label"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    Current tier
                  </div>
                  <div
                    className="f-headline text-[40px] mt-1"
                    style={{ color: accentColor }}
                  >
                    {phase.currentTierName}
                  </div>
                  <div className="mt-4">
                    <Link
                      href={`/c/${handle}/t/${phase.currentTierId}`}
                      className="f-label inline-flex items-center h-11 px-5"
                      style={{ background: accentColor, color: "var(--bone)" }}
                    >
                      Open your perks →
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p
                    className="f-body text-[15px]"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    You aren't at a tier yet. Pick up ${tokenTicker} on Bags —
                    the lowest tier unlocks at{" "}
                    {tiers[0]?.threshold
                      ? Number(tiers[0].threshold).toLocaleString()
                      : "—"}{" "}
                    ${tokenTicker}.
                  </p>
                  {tokenMint && (
                    <a
                      href={`https://bags.fm/token/${tokenMint}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 f-label inline-flex items-center h-11 px-5 border border-ink hover:bg-ink hover:text-bone"
                    >
                      Buy ${tokenTicker} on Bags →
                    </a>
                  )}
                </>
              )}
            </div>

            {(phase.granted.length > 0 || phase.revoked.length > 0) && (
              <ul
                className="mt-8 f-mono text-[12px] space-y-1"
                style={{ color: "var(--ink-soft)" }}
              >
                {phase.granted.map((g) => (
                  <li key={`g${g}`}>
                    <span style={{ color: accentColor }}>granted</span> · {g}
                  </li>
                ))}
                {phase.revoked.map((g) => (
                  <li key={`r${g}`}>
                    <span style={{ color: "var(--ink-faint)" }}>revoked</span> · {g}
                  </li>
                ))}
              </ul>
            )}
            {phase.errors.length > 0 && (
              <ul
                className="mt-4 f-mono text-[12px] space-y-1"
                style={{ color: "var(--vermillion)" }}
              >
                {phase.errors.map((e, i) => (
                  <li key={i}>
                    {e.pluginId}: {e.error}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 flex items-center gap-3">
              <Button
                onClick={() => wallet && verify(wallet)}
                variant="outline"
                size="sm"
              >
                Re-verify
              </Button>
              <span
                className="f-mono text-[11px]"
                style={{ color: "var(--ink-faint)" }}
              >
                Run again after buying or selling
              </span>
            </div>
          </div>
        )}

        {phase.kind === "idle" && wallet && (
          <div className="border border-rule p-8">
            <div className="f-label mb-2" style={{ color: "var(--ink-faint)" }}>
              Wallet connected
            </div>
            <div className="f-mono text-[20px] mb-6">
              {shortAddress(wallet, 6)}
            </div>
            <Button onClick={() => verify(wallet)} variant="ink" size="lg">
              Verify holdings →
            </Button>
          </div>
        )}
      </section>

      <aside className="col-span-12 md:col-span-5">
        <div className="f-label mb-4" style={{ color: "var(--ink-faint)" }}>
          Tier thresholds
        </div>
        <ul className="border-y border-rule-soft divide-y divide-rule-soft">
          {tiers.map((t) => {
            const reached =
              phase.kind === "verified" &&
              BigInt(phase.balance) >= BigInt(t.threshold);
            const current =
              phase.kind === "verified" && phase.currentTierId === t.id;
            return (
              <li
                key={t.id}
                className="py-5 flex items-baseline justify-between gap-4"
              >
                <div>
                  <div
                    className="f-headline text-[20px]"
                    style={{ color: current ? accentColor : "var(--ink)" }}
                  >
                    {t.name}
                  </div>
                  <div
                    className="f-mono text-[11px] mt-1"
                    style={{
                      color: reached ? accentColor : "var(--ink-faint)",
                    }}
                  >
                    {reached ? "✓ reached" : "· not yet"}
                    {current ? " · current" : ""}
                  </div>
                </div>
                <div className="f-mono text-[16px] tabular-nums">
                  {Number(t.threshold).toLocaleString()}
                </div>
              </li>
            );
          })}
          {tiers.length === 0 && (
            <li className="py-8 text-center">
              <p
                className="f-body text-[14px]"
                style={{ color: "var(--ink-faint)" }}
              >
                No tiers defined yet.
              </p>
            </li>
          )}
        </ul>
      </aside>
    </div>
  );
}

function StatusCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="border border-rule p-8">
      <div className="f-label mb-2" style={{ color: "var(--vermillion)" }}>
        {label}…
      </div>
      <p className="f-body text-[15px]">{body}</p>
      <div
        className="mt-5 h-[2px] relative overflow-hidden"
        style={{ background: "var(--rule-soft)" }}
      >
        <div
          className="absolute inset-y-0 w-1/3 animate-[slide_1.6s_linear_infinite]"
          style={{ background: "var(--vermillion)" }}
        />
      </div>
      <style>{`@keyframes slide{from{transform:translateX(-100%)}to{transform:translateX(300%)}}`}</style>
    </div>
  );
}

function formatBalance(atoms: string): string {
  try {
    const v = BigInt(atoms);
    const whole = v / 1000000000n;
    return whole.toLocaleString();
  } catch {
    return "0";
  }
}
