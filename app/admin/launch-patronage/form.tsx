"use client";

import { useState } from "react";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { Button } from "@/components/button";
import { detectWallet, shortAddress } from "@/lib/auth/client";

type Phase =
  | { kind: "idle" }
  | { kind: "preparing" }
  | {
      kind: "ready";
      txBase64: string;
      tokenMint: string;
      symbol: string;
    }
  | { kind: "signing" }
  | { kind: "broadcasting" }
  | { kind: "done"; signature: string; tokenMint: string }
  | { kind: "error"; message: string };

export function LaunchPatronageForm({
  signedInWallet,
  rpcUrl,
}: {
  signedInWallet: string;
  rpcUrl: string;
}) {
  const [symbol, setSymbol] = useState("PATRONAGE");
  const [name, setName] = useState("Patronage");
  const [description, setDescription] = useState(
    "The persistent holder-utility layer for Bags tokens. $PATRONAGE routes partner fees from every Patronage-launched creator token to its holders — in return, holders earn perks across every Patronage creator and creators earn a fee waiver for holding.",
  );
  const [imageUrl, setImageUrl] = useState(
    "https://patronage.fm/seal.png",
  );
  const [website, setWebsite] = useState("https://patronage.fm");
  const [twitter, setTwitter] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  async function onPrepare(e: React.FormEvent) {
    e.preventDefault();
    setPhase({ kind: "preparing" });
    try {
      const res = await fetch("/api/admin/launch-patronage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          name,
          description,
          imageUrl,
          website: website || undefined,
          twitter: twitter || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Prepare failed");
      setPhase({
        kind: "ready",
        txBase64: j.tx,
        tokenMint: j.tokenMint,
        symbol: j.symbol,
      });
    } catch (e) {
      setPhase({
        kind: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async function onSign() {
    if (phase.kind !== "ready") return;
    setPhase({ kind: "signing" });
    try {
      const wallet = detectWallet();
      if (!wallet) throw new Error("No wallet detected");
      const txBytes = base64ToBytes(phase.txBase64);
      const tx = VersionedTransaction.deserialize(txBytes);
      // @ts-expect-error signTransaction exists on Phantom / Solflare
      const signed: VersionedTransaction = await wallet.signTransaction(tx);
      setPhase({ kind: "broadcasting" });

      if (!rpcUrl) throw new Error("Missing NEXT_PUBLIC_SOLANA_RPC");
      const conn = new Connection(rpcUrl, "confirmed");
      const signature = await conn.sendRawTransaction(signed.serialize());
      await conn.confirmTransaction(signature, "confirmed");

      setPhase({ kind: "done", signature, tokenMint: phase.tokenMint });
    } catch (e) {
      setPhase({
        kind: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (phase.kind === "done") {
    return (
      <div className="border border-rule p-8 max-w-[720px] relative">
        <div className="absolute -top-[1px] -left-[1px] -right-[1px] rule-thick" />
        <div
          className="f-label mb-2"
          style={{ color: "var(--vermillion)" }}
        >
          ✓ $PATRONAGE launched
        </div>
        <div className="f-display text-[56px]">$PATRONAGE</div>
        <div
          className="f-mono text-[13px] mt-3 break-all"
          style={{ color: "var(--ink-soft)" }}
        >
          Mint · {phase.tokenMint}
        </div>
        <div
          className="f-mono text-[13px] mt-1 break-all"
          style={{ color: "var(--ink-soft)" }}
        >
          Sig · {phase.signature}
        </div>
        <p
          className="f-body text-[14px] mt-6 p-4 border border-rule"
          style={{ color: "var(--ink-soft)", background: "var(--bone-warm)" }}
        >
          <strong className="f-label">
            Next:{" "}
          </strong>
          add{" "}
          <span className="f-mono">PATRONAGE_MINT={phase.tokenMint}</span> to
          your <span className="f-mono">.env.local</span> and redeploy. All
          new creator-token launches will route the partner BPS here.
        </p>
        <div className="mt-5 flex gap-3">
          <a
            href={`https://solscan.io/token/${phase.tokenMint}`}
            target="_blank"
            rel="noreferrer"
            className="f-label inline-flex items-center h-10 px-4 border border-ink hover:bg-ink hover:text-bone"
          >
            Solscan →
          </a>
          <a
            href={`https://bags.fm/token/${phase.tokenMint}`}
            target="_blank"
            rel="noreferrer"
            className="f-label inline-flex items-center h-10 px-4 border border-rule hover:border-ink"
          >
            Bags →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-10 max-w-[1100px]">
      <form onSubmit={onPrepare} className="col-span-12 md:col-span-7 space-y-8">
        <div
          className="f-mono text-[12px] p-3 border border-rule"
          style={{ color: "var(--ink-soft)" }}
        >
          Signing as {shortAddress(signedInWallet)}. Costs ~0.02 SOL. No
          partner fees — $PATRONAGE is the root of the rail.
        </div>
        <Field label="Ticker">
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            required
            maxLength={12}
            className="w-[280px] bg-transparent border-b border-ink outline-none py-2 f-mono text-[22px] uppercase focus:border-vermillion"
          />
        </Field>
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            className="w-full bg-transparent border-b border-ink outline-none py-2 f-headline text-[26px] focus:border-vermillion"
          />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            maxLength={2000}
            className="w-full bg-transparent border border-rule outline-none p-4 f-body text-[14px] focus:border-vermillion resize-none"
          />
        </Field>
        <Field label="Image URL (square, public)">
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            required
            type="url"
            className="w-full bg-transparent border-b border-ink outline-none py-2 f-mono text-[13px] focus:border-vermillion"
          />
        </Field>
        <Field label="Website">
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            type="url"
            className="w-full bg-transparent border-b border-rule outline-none py-2 f-mono text-[13px] focus:border-vermillion"
          />
        </Field>
        <Field label="Twitter / X handle">
          <input
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            placeholder="patronage_fm"
            className="w-full bg-transparent border-b border-rule outline-none py-2 f-mono text-[13px] focus:border-vermillion"
          />
        </Field>

        {phase.kind === "error" && (
          <div
            className="p-3 border f-mono text-[12px]"
            style={{
              borderColor: "var(--vermillion)",
              color: "var(--vermillion)",
            }}
          >
            {phase.message}
          </div>
        )}

        <Button
          type="submit"
          variant="vermillion"
          size="lg"
          disabled={phase.kind === "preparing"}
        >
          {phase.kind === "preparing" ? "Preparing…" : "Prepare launch →"}
        </Button>
      </form>

      <aside className="col-span-12 md:col-span-5">
        {phase.kind === "ready" && (
          <div
            className="border border-rule p-6"
            style={{ background: "var(--bone-warm)" }}
          >
            <div
              className="f-label mb-2"
              style={{ color: "var(--vermillion)" }}
            >
              Ready to sign
            </div>
            <div className="f-display text-[44px]">${phase.symbol}</div>
            <div
              className="f-mono text-[11px] mt-3 break-all"
              style={{ color: "var(--ink-faint)" }}
            >
              {phase.tokenMint}
            </div>
            <Button
              onClick={onSign}
              variant="vermillion"
              size="lg"
              className="mt-5"
            >
              Sign & submit →
            </Button>
          </div>
        )}
        {phase.kind === "signing" && (
          <div className="f-mono text-[12px]">Waiting for signature…</div>
        )}
        {phase.kind === "broadcasting" && (
          <div className="f-mono text-[12px]">Broadcasting to mainnet…</div>
        )}
      </aside>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="f-label mb-2 block" style={{ color: "var(--ink-faint)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
