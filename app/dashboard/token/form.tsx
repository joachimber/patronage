"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { Button } from "@/components/button";
import { detectWallet } from "@/lib/auth/client";

interface Props {
  creatorWallet: string;
  existingMint: string | null;
  existingTicker: string | null;
  existingName: string | null;
  defaultName: string;
  patronageMint: string | null;
  defaultPartnerBps: number;
  rpcUrl: string;
}

type Phase =
  | { kind: "idle" }
  | { kind: "preparing" }
  | {
      kind: "ready";
      txBase64: string;
      tokenMint: string;
      symbol: string;
      name: string;
      partnerBps: number;
    }
  | { kind: "signing" }
  | { kind: "broadcasting" }
  | {
      kind: "done";
      signature: string;
      tokenMint: string;
      symbol: string;
    }
  | { kind: "error"; message: string };

export function LaunchForm(props: Props) {
  const router = useRouter();
  const [name, setName] = useState(props.existingName ?? props.defaultName);
  const [symbol, setSymbol] = useState(props.existingTicker ?? "");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [partnerBps, setPartnerBps] = useState(props.defaultPartnerBps);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  if (props.existingMint) {
    return (
      <div className="border border-rule p-8 max-w-[720px]">
        <div className="f-label mb-3" style={{ color: "var(--vermillion)" }}>
          Already launched
        </div>
        <div className="f-headline text-[30px]">
          ${props.existingTicker}{" "}
          <span className="f-editorial text-[24px]">
            — {props.existingName}
          </span>
        </div>
        <div
          className="f-mono text-[13px] mt-3"
          style={{ color: "var(--ink-soft)" }}
        >
          Mint · {props.existingMint}
        </div>
        <div className="mt-6 flex gap-3">
          <a
            href={`https://bags.fm/token/${props.existingMint}`}
            target="_blank"
            rel="noreferrer"
            className="f-label inline-flex items-center h-10 px-4 border border-ink hover:bg-ink hover:text-bone"
          >
            View on Bags →
          </a>
          <a
            href={`https://solscan.io/token/${props.existingMint}`}
            target="_blank"
            rel="noreferrer"
            className="f-label inline-flex items-center h-10 px-4 border border-rule hover:border-ink"
          >
            Solscan →
          </a>
        </div>
      </div>
    );
  }

  async function onPrepare(e: React.FormEvent) {
    e.preventDefault();
    setPhase({ kind: "preparing" });
    try {
      const res = await fetch("/api/tokens/launch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          symbol: symbol.toUpperCase(),
          description,
          imageUrl,
          partnerBps,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not prepare launch");
      setPhase({
        kind: "ready",
        txBase64: j.tx,
        tokenMint: j.tokenMint,
        symbol: j.symbol,
        name: j.name,
        partnerBps: j.partnerBps,
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

      // @ts-expect-error — Phantom / Solflare expose signTransaction
      const signed: VersionedTransaction = await wallet.signTransaction(tx);
      setPhase({ kind: "broadcasting" });

      if (!props.rpcUrl) throw new Error("Missing NEXT_PUBLIC_SOLANA_RPC");
      const conn = new Connection(props.rpcUrl, "confirmed");
      const signature = await conn.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
      });
      await conn.confirmTransaction(signature, "confirmed");

      // Persist to our DB so the profile shows the mint
      await fetch("/api/tokens/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tokenMint: phase.tokenMint,
          tokenTicker: phase.symbol,
          tokenName: phase.name,
          tokenImageUrl: imageUrl,
          signature,
          partnerBps: phase.partnerBps,
        }),
      });

      setPhase({
        kind: "done",
        signature,
        tokenMint: phase.tokenMint,
        symbol: phase.symbol,
      });
      setTimeout(() => router.refresh(), 600);
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
        <div className="f-label mb-2" style={{ color: "var(--vermillion)" }}>
          ✓ Launched
        </div>
        <div className="f-display text-[56px]">${phase.symbol}</div>
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
        <div className="mt-6 flex gap-3">
          <a
            href={`https://solscan.io/tx/${phase.signature}`}
            target="_blank"
            rel="noreferrer"
            className="f-label inline-flex items-center h-10 px-4 border border-ink hover:bg-ink hover:text-bone"
          >
            View transaction →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-10 max-w-[1100px]">
      <form onSubmit={onPrepare} className="col-span-12 md:col-span-7 space-y-8">
        <Field label="Token name" hint="Full display name — e.g. Alice's Patrons.">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            className="w-full bg-transparent border-0 border-b border-ink outline-none py-2 f-headline text-[28px] focus:border-vermillion"
          />
        </Field>

        <Field label="Ticker" hint="1–12 characters, uppercase. Example: ALICE.">
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            required
            maxLength={12}
            pattern="[A-Z0-9]{1,12}"
            placeholder="ALICE"
            className="w-[280px] bg-transparent border-0 border-b border-ink outline-none py-2 f-mono text-[22px] uppercase focus:border-vermillion"
          />
        </Field>

        <Field
          label="Description"
          hint="Shown on Bags and your Patronage page."
        >
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={3}
            maxLength={2000}
            className="w-full bg-transparent border border-rule outline-none p-4 f-body text-[15px] focus:border-vermillion resize-none"
          />
        </Field>

        <Field
          label="Image URL"
          hint="Public URL to a square PNG or JPG. Will be pinned by Bags on IPFS."
        >
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            required
            type="url"
            placeholder="https://…/token.png"
            className="w-full bg-transparent border-0 border-b border-ink outline-none py-2 f-mono text-[14px] focus:border-vermillion"
          />
        </Field>

        <Field
          label="Patronage partner fee"
          hint={
            props.patronageMint
              ? "BPS routed to $PATRONAGE treasury. Waived if you hold ≥ threshold."
              : "$PATRONAGE is not launched yet — all fees stay with you for this launch."
          }
        >
          <div className="flex items-center gap-4">
            <input
              type="number"
              min={0}
              max={2000}
              value={partnerBps}
              disabled={!props.patronageMint}
              onChange={(e) => setPartnerBps(Math.max(0, Number(e.target.value)))}
              className="w-28 bg-transparent border-b border-ink outline-none py-2 f-mono text-[18px] text-right focus:border-vermillion disabled:opacity-50"
            />
            <span
              className="f-mono text-[12px]"
              style={{ color: "var(--ink-faint)" }}
            >
              BPS · {(partnerBps / 100).toFixed(2)}%
            </span>
          </div>
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

        <div className="flex items-center gap-4 pt-2">
          <Button
            type="submit"
            variant="ink"
            size="lg"
            disabled={phase.kind === "preparing"}
          >
            {phase.kind === "preparing" ? "Preparing…" : "Prepare launch →"}
          </Button>
          <span
            className="f-mono text-[12px]"
            style={{ color: "var(--ink-faint)" }}
          >
            Your wallet signs next. Costs ~0.02 SOL.
          </span>
        </div>
      </form>

      <aside className="col-span-12 md:col-span-5">
        <div className="border border-rule p-6">
          <div className="f-label mb-3" style={{ color: "var(--ink-faint)" }}>
            Launch preview
          </div>
          <div className="f-headline text-[28px]">${symbol || "TICKER"}</div>
          <div
            className="f-editorial text-[18px] mt-1"
            style={{ color: "var(--ink-soft)" }}
          >
            {name || "Token name"}
          </div>
          <div className="rule-h my-5" />
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 f-mono text-[12px]">
            <dt style={{ color: "var(--ink-faint)" }}>Network</dt>
            <dd>Solana mainnet-beta</dd>
            <dt style={{ color: "var(--ink-faint)" }}>SDK</dt>
            <dd>@bagsfm/bags-sdk</dd>
            <dt style={{ color: "var(--ink-faint)" }}>Partner</dt>
            <dd>
              {props.patronageMint
                ? `$PATRONAGE · ${(partnerBps / 100).toFixed(2)}%`
                : "None (pre-$PATRONAGE)"}
            </dd>
            <dt style={{ color: "var(--ink-faint)" }}>Creator cut</dt>
            <dd>{(100 - partnerBps / 100).toFixed(2)}%</dd>
          </dl>
        </div>

        {phase.kind === "ready" && (
          <div
            className="mt-6 border border-rule p-6"
            style={{ background: "var(--bone-warm)" }}
          >
            <div className="f-label mb-2" style={{ color: "var(--vermillion)" }}>
              Ready to sign
            </div>
            <p
              className="f-body text-[13px] mb-4"
              style={{ color: "var(--ink-soft)" }}
            >
              Mint prepared. Your wallet will pop up. Review and approve to
              submit on-chain.
            </p>
            <div
              className="f-mono text-[11px] break-all mb-4"
              style={{ color: "var(--ink-faint)" }}
            >
              {phase.tokenMint}
            </div>
            <Button onClick={onSign} variant="vermillion" size="lg">
              Sign & submit →
            </Button>
          </div>
        )}

        {phase.kind === "signing" && (
          <div className="mt-6 f-mono text-[12px]">
            Waiting for wallet signature…
          </div>
        )}
        {phase.kind === "broadcasting" && (
          <div className="mt-6 f-mono text-[12px]">
            Broadcasting to mainnet…
          </div>
        )}
      </aside>
    </div>
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

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
