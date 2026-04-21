"use client";
import bs58 from "bs58";

/**
 * Phantom/Solflare inject a `provider.solana` on window. We target that
 * directly to avoid the wallet-adapter-react-ui look — every pixel is
 * ours to design.
 */

export interface InjectedSolanaProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey?: { toString(): string } | null;
  connect: (opts?: {
    onlyIfTrusted?: boolean;
  }) => Promise<{ publicKey: { toString(): string } }>;
  disconnect: () => Promise<void>;
  signMessage: (
    message: Uint8Array,
    encoding?: string,
  ) => Promise<{ signature: Uint8Array } | Uint8Array>;
}

declare global {
  interface Window {
    solana?: InjectedSolanaProvider;
    solflare?: InjectedSolanaProvider;
    phantom?: { solana?: InjectedSolanaProvider };
  }
}

export function detectWallet(): InjectedSolanaProvider | null {
  if (typeof window === "undefined") return null;
  return (
    window.phantom?.solana ??
    window.solana ??
    window.solflare ??
    null
  );
}

export async function connectWallet(): Promise<string> {
  const w = detectWallet();
  if (!w) {
    throw new Error(
      "No Solana wallet detected. Install Phantom or Solflare.",
    );
  }
  const { publicKey } = await w.connect();
  return publicKey.toString();
}

export async function signIn(wallet: string): Promise<{
  wallet: string;
  role: "holder" | "creator";
  creatorId: string | null;
}> {
  const w = detectWallet();
  if (!w) throw new Error("No Solana wallet detected.");

  const nonceRes = await fetch("/api/auth/nonce", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ wallet }),
  });
  if (!nonceRes.ok) {
    const j = await nonceRes.json().catch(() => ({}));
    throw new Error(j.error ?? "Could not request nonce");
  }
  const { message } = (await nonceRes.json()) as { message: string };

  const encoded = new TextEncoder().encode(message);
  const sigRes = await w.signMessage(encoded, "utf8");
  const sigBytes =
    sigRes instanceof Uint8Array ? sigRes : sigRes.signature;
  const signature = bs58.encode(sigBytes);

  const cbRes = await fetch("/api/auth/callback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ wallet, signature, message }),
  });
  if (!cbRes.ok) {
    const j = await cbRes.json().catch(() => ({}));
    throw new Error(j.error ?? "Sign-in failed");
  }
  return cbRes.json();
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
  const w = detectWallet();
  if (w) {
    try {
      await w.disconnect();
    } catch {}
  }
}

export { shortAddress } from "./format";
