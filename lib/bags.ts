import { BagsSDK } from "@bagsfm/bags-sdk";
import { Connection, PublicKey, type VersionedTransaction } from "@solana/web3.js";
import { env } from "./env";

/**
 * Thin wrapper around @bagsfm/bags-sdk.
 *
 * The Bags SDK owns all the complex launch sequencing; we mainly wrap it to:
 * (1) share a single SDK instance + Solana Connection across server modules,
 * (2) centralise env plumbing, and
 * (3) expose the specific shapes Patronage needs (tier-linked launches with
 *     partner-fee routing).
 */

let _sdk: BagsSDK | null = null;
let _connection: Connection | null = null;

export function connection(): Connection {
  if (_connection) return _connection;
  _connection = new Connection(env.HELIUS_RPC_URL, "confirmed");
  return _connection;
}

export function bags(): BagsSDK {
  if (_sdk) return _sdk;
  _sdk = new BagsSDK(env.BAGS_API_KEY, connection(), "confirmed");
  return _sdk;
}

/**
 * Resolve a Bags fee-share wallet for a given social handle. Used when a
 * creator launches a token linked to their Twitter/TikTok/Kick/GitHub handle.
 */
export async function resolveLaunchWallet(
  username: string,
  provider: "twitter" | "tiktok" | "kick" | "github",
) {
  return bags().state.getLaunchWalletV2(username, provider);
}

/**
 * Resolve the creators (fee claimers) tied to a Bags-launched mint. Not a
 * list of holders — for that we hit Helius directly via @/lib/helius.
 */
export async function getTokenCreators(mint: string) {
  return bags().state.getTokenCreators(new PublicKey(mint));
}

export async function getTokenLifetimeFees(mint: string) {
  return bags().state.getTokenLifetimeFees(new PublicKey(mint));
}

/**
 * Prepare a token launch on Bags. Returns the unsigned VersionedTransaction
 * for the creator to sign in their browser wallet.
 *
 * This is the canonical 4-call sequence from the Bags docs:
 * 1. createTokenInfoAndMetadata → tokenMint + metadataUrl
 * 2. (optional) resolveLaunchWallet for each fee claimer
 * 3. createBagsFeeShareConfig → configKey
 * 4. createLaunchTransaction → VersionedTransaction
 */
export interface PrepareLaunchInput {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  creatorWallet: string;
  feeClaimers: Array<{ user: string; userBps: number }>;
  partner?: string;
  partnerBps?: number;
  initialBuyLamports?: number;
  website?: string;
  twitter?: string;
  telegram?: string;
}

export interface PrepareLaunchResult {
  tokenMint: string;
  metadataUrl: string;
  configKey: string;
  transaction: VersionedTransaction;
}

export async function prepareLaunch(
  input: PrepareLaunchInput,
): Promise<PrepareLaunchResult> {
  const sdk = bags();

  // Step 1 — token info + IPFS metadata
  const info = await sdk.tokenLaunch.createTokenInfoAndMetadata({
    imageUrl: input.imageUrl,
    name: input.name,
    symbol: input.symbol,
    description: input.description,
    twitter: input.twitter,
    telegram: input.telegram,
    website: input.website,
  });

  // Step 2 — normalise fee claimers. BPS must sum to 10000.
  const claimers = input.feeClaimers.map((c) => ({
    user: new PublicKey(c.user),
    userBps: c.userBps,
  }));
  const sum = claimers.reduce((n, c) => n + c.userBps, 0);
  if (sum !== 10_000) {
    throw new Error(
      `Fee-share BPS must sum to 10000, got ${sum}. Claimers: ${JSON.stringify(input.feeClaimers)}`,
    );
  }

  // Step 3 — fee share config
  const feeShare = await sdk.config.createBagsFeeShareConfig({
    feeClaimers: claimers,
    payer: new PublicKey(input.creatorWallet),
    baseMint: new PublicKey(info.tokenMint),
    partner: input.partner ? new PublicKey(input.partner) : undefined,
  });

  // Step 4 — launch transaction
  const tx = await sdk.tokenLaunch.createLaunchTransaction({
    metadataUrl: info.tokenMetadata,
    tokenMint: new PublicKey(info.tokenMint),
    launchWallet: new PublicKey(input.creatorWallet),
    initialBuyLamports: input.initialBuyLamports ?? 0,
    configKey: feeShare.meteoraConfigKey,
  });

  return {
    tokenMint: info.tokenMint.toString(),
    metadataUrl: info.tokenMetadata,
    configKey: feeShare.meteoraConfigKey.toString(),
    transaction: tx,
  };
}
