"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { connectWallet, logout, shortAddress, signIn } from "@/lib/auth/client";
import { Button, type ButtonProps } from "./button";

type State =
  | { kind: "idle" }
  | { kind: "connecting" }
  | { kind: "connected"; wallet: string }
  | { kind: "authed"; wallet: string; role: "holder" | "creator" }
  | { kind: "error"; message: string };

export interface ConnectButtonProps {
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  afterAuth?: (res: {
    wallet: string;
    role: "holder" | "creator";
    creatorId: string | null;
  }) => void;
  className?: string;
}

/**
 * Single-button wallet connect. Detects Phantom/Solflare, pops connect,
 * requests a nonce, asks the wallet to sign, and posts to /api/auth/callback.
 *
 * On success it either invokes `afterAuth` (unlock page, onboarding) or
 * refreshes the current route.
 */
export function ConnectButton({
  label = "Connect wallet",
  variant = "ink",
  size = "md",
  afterAuth,
  className,
}: ConnectButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (j.authenticated) {
          setState({ kind: "authed", wallet: j.wallet, role: j.role });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function onConnect() {
    setState({ kind: "connecting" });
    try {
      const wallet = await connectWallet();
      setState({ kind: "connected", wallet });
      const res = await signIn(wallet);
      setState({ kind: "authed", wallet: res.wallet, role: res.role });
      afterAuth?.(res);
      startTransition(() => router.refresh());
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  }

  async function onLogout() {
    await logout();
    setState({ kind: "idle" });
    startTransition(() => router.refresh());
  }

  if (state.kind === "authed") {
    return (
      <button
        onClick={onLogout}
        className="f-label inline-flex items-center gap-2 h-9 px-3 border border-rule hover:border-ink transition-colors"
        style={{ color: "var(--ink)" }}
        title={`Disconnect ${state.wallet}`}
      >
        <span
          className="w-[7px] h-[7px] rounded-full"
          style={{ background: "var(--vermillion)" }}
          aria-hidden
        />
        <span className="f-mono text-[11px]">{shortAddress(state.wallet)}</span>
      </button>
    );
  }

  const busy = state.kind === "connecting" || pending;
  return (
    <div className={className}>
      <Button
        onClick={onConnect}
        disabled={busy}
        variant={variant}
        size={size}
      >
        {busy ? "Connecting…" : label}
      </Button>
      {state.kind === "error" && (
        <p
          className="f-mono text-[10px] mt-2"
          style={{ color: "var(--vermillion)" }}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
