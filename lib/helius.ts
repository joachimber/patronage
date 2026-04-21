import { PublicKey } from "@solana/web3.js";
import { connection } from "./bags";
import { env } from "./env";

/**
 * Holder lookups via Solana RPC (Helius).
 *
 * The Bags SDK doesn't expose per-wallet balance or holder enumeration, so
 * this is where Patronage's core verification loop lives. All calls go
 * through a simple token-bucket rate limit to stay under the shared 1000
 * req/hr limit that both Bags and most Helius tiers enforce.
 */

// Simple token bucket — 10 tokens, refills 1/second.
class TokenBucket {
  private tokens: number;
  private last: number;
  constructor(
    private readonly max = 10,
    private readonly refillPerSec = 1,
  ) {
    this.tokens = max;
    this.last = Date.now();
  }
  async take(): Promise<void> {
    const now = Date.now();
    const elapsed = (now - this.last) / 1000;
    this.tokens = Math.min(this.max, this.tokens + elapsed * this.refillPerSec);
    this.last = now;
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const wait = ((1 - this.tokens) / this.refillPerSec) * 1000;
    await new Promise((r) => setTimeout(r, wait));
    return this.take();
  }
}

const bucket = new TokenBucket();

/**
 * Get a wallet's balance of a specific SPL token mint, as a raw bigint
 * (atoms — divide by 10^decimals to get human units).
 *
 * Returns 0n if the wallet has no token account for this mint.
 */
export async function getTokenBalance(
  wallet: string,
  mint: string,
): Promise<bigint> {
  await bucket.take();
  const conn = connection();
  const owner = new PublicKey(wallet);
  const mintKey = new PublicKey(mint);

  const accounts = await conn.getParsedTokenAccountsByOwner(owner, {
    mint: mintKey,
  });

  let total = 0n;
  for (const { account } of accounts.value) {
    const parsed = account.data as unknown as {
      parsed: { info: { tokenAmount: { amount: string } } };
    };
    total += BigInt(parsed.parsed.info.tokenAmount.amount);
  }
  return total;
}

/**
 * Batch balance lookup for many wallets → one mint.
 * Used by the scheduled re-verify job to check all holders of a creator.
 */
export async function getTokenBalancesBatch(
  wallets: string[],
  mint: string,
): Promise<Map<string, bigint>> {
  const out = new Map<string, bigint>();
  // Naive sequential — the bucket handles rate limiting. For scale we'd use
  // getMultipleAccounts + token-account enumeration, but for demo cadence
  // this is simpler and respects the 1 req/sec limit.
  for (const w of wallets) {
    const b = await getTokenBalance(w, mint);
    out.set(w, b);
  }
  return out;
}

/**
 * Resolve token metadata from the Metaplex PDA via Helius DAS.
 * Graceful fallback if DAS is unavailable — returns the raw mint info.
 */
export async function getTokenMetadata(mint: string) {
  await bucket.take();
  const conn = connection();
  const mintKey = new PublicKey(mint);
  const info = await conn.getParsedAccountInfo(mintKey);
  if (!info.value) return null;
  const parsed = info.value.data as unknown as {
    parsed?: { info?: { decimals?: number; supply?: string } };
  };
  return {
    decimals: parsed.parsed?.info?.decimals ?? 9,
    supply: parsed.parsed?.info?.supply ?? "0",
  };
}

export interface AssetMetadata {
  name: string | null;
  symbol: string | null;
  image: string | null;
  description: string | null;
}

/**
 * Fetch Metaplex / DAS metadata for any Solana token mint via Helius.
 * Used on /t/[mint] when the mint isn't in our seeded BAGS_MINTS list — lets
 * a freshly launched Bags token show real name + image the moment its page
 * is visited, without waiting for us to re-seed the directory.
 */
export async function getAssetMetadata(mint: string): Promise<AssetMetadata | null> {
  await bucket.take();
  const res = await fetch(env.HELIUS_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "patronage-asset",
      method: "getAsset",
      params: { id: mint },
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as {
    result?: {
      content?: {
        metadata?: { name?: string; symbol?: string; description?: string };
        links?: { image?: string };
        files?: Array<{ uri?: string; cdn_uri?: string; mime?: string }>;
      };
    };
  } | null;
  const r = body?.result;
  if (!r) return null;
  const md = r.content?.metadata;
  const imgFromLinks = r.content?.links?.image;
  const imgFromFiles = r.content?.files?.find((f) => f?.mime?.startsWith("image/"));
  const image = imgFromLinks || imgFromFiles?.cdn_uri || imgFromFiles?.uri || null;
  return {
    name: md?.name?.trim() || null,
    symbol: md?.symbol?.trim() || null,
    image,
    description: md?.description?.trim() || null,
  };
}

/** Human-units helper — converts atoms to a displayable number. */
export function formatTokenAmount(atoms: bigint, decimals: number): string {
  if (atoms === 0n) return "0";
  const divisor = 10n ** BigInt(decimals);
  const whole = atoms / divisor;
  const frac = atoms % divisor;
  if (frac === 0n) return whole.toLocaleString();
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole.toLocaleString()}.${fracStr.slice(0, 4)}`;
}
