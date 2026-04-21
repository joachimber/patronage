import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { creators } from "@/lib/db/schema";
import { getSession, setSession } from "@/lib/auth/session";
import { isLikelySolanaMint, getMintMeta, mintTicker, mintName } from "@/lib/bags-mints";
import { getAssetMetadata } from "@/lib/helius";
import { getTokenCreators } from "@/lib/bags";

const handleRx = /^[a-z0-9][a-z0-9_-]{1,62}[a-z0-9]$/;

const createSchema = z.object({
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(64)
    .refine((h) => handleRx.test(h), "Handle must be lowercase a-z, 0-9, - or _"),
  displayName: z.string().trim().min(1).max(120),
  tagline: z.string().trim().max(240).optional(),
  bio: z.string().trim().max(2000).optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  tokenMint: z
    .string()
    .trim()
    .refine(isLikelySolanaMint, "Invalid mint address")
    .optional(),
});

async function verifyFeeClaimer(mint: string, wallet: string): Promise<boolean> {
  // Best-effort: if Bags can resolve creators for this mint, require the
  // session wallet to be one of them. If the SDK call fails or returns an
  // empty list (e.g. brand-new mint still indexing), allow through so a
  // legitimate creator isn't blocked by lag.
  try {
    const list = await getTokenCreators(mint);
    if (!list || list.length === 0) return true;
    return list.some((c) => c.wallet === wallet);
  } catch {
    return true;
  }
}

async function resolveMintMeta(mint: string) {
  const seed = getMintMeta(mint);
  const live = seed ? null : await getAssetMetadata(mint).catch(() => null);
  return {
    ticker: (seed?.symbol?.trim() || live?.symbol || mintTicker(mint)).toUpperCase(),
    name: seed?.name?.trim() || live?.name || mintName(mint),
    image: seed?.image || live?.image || null,
  };
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.wallet) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const existing = await db()
    .select({ id: creators.id, wallet: creators.wallet })
    .from(creators)
    .where(eq(creators.handle, parsed.data.handle));
  if (existing.length > 0 && existing[0].wallet !== session.wallet) {
    return NextResponse.json(
      { error: "Handle is already taken" },
      { status: 409 },
    );
  }

  const ownedByWallet = await db()
    .select()
    .from(creators)
    .where(eq(creators.wallet, session.wallet));

  // If the user is claiming an existing mint, verify ownership + make sure
  // another creator hasn't already claimed it.
  let mintFields: {
    tokenMint: string;
    tokenTicker: string;
    tokenName: string;
    tokenImageUrl: string | null;
  } | null = null;
  if (parsed.data.tokenMint) {
    const mint = parsed.data.tokenMint;
    const claimedByOther = await db()
      .select({ id: creators.id })
      .from(creators)
      .where(
        ownedByWallet.length > 0
          ? and(eq(creators.tokenMint, mint), ne(creators.id, ownedByWallet[0].id))
          : eq(creators.tokenMint, mint),
      );
    if (claimedByOther.length > 0) {
      return NextResponse.json(
        { error: "This token has already been claimed on Patronage" },
        { status: 409 },
      );
    }
    const ok = await verifyFeeClaimer(mint, session.wallet);
    if (!ok) {
      return NextResponse.json(
        { error: "Your wallet isn't listed as a fee claimer on this token" },
        { status: 403 },
      );
    }
    const meta = await resolveMintMeta(mint);
    mintFields = {
      tokenMint: mint,
      tokenTicker: meta.ticker,
      tokenName: meta.name,
      tokenImageUrl: meta.image,
    };
  }

  let creator;
  if (ownedByWallet.length > 0) {
    const [updated] = await db()
      .update(creators)
      .set({
        handle: parsed.data.handle,
        displayName: parsed.data.displayName,
        tagline: parsed.data.tagline,
        bio: parsed.data.bio,
        accentColor: parsed.data.accentColor,
        ...(mintFields ?? {}),
        updatedAt: new Date(),
      })
      .where(eq(creators.id, ownedByWallet[0].id))
      .returning();
    creator = updated;
  } else {
    const [created] = await db()
      .insert(creators)
      .values({
        handle: parsed.data.handle,
        displayName: parsed.data.displayName,
        tagline: parsed.data.tagline,
        bio: parsed.data.bio,
        accentColor: parsed.data.accentColor,
        wallet: session.wallet,
        ...(mintFields ?? {}),
      })
      .returning();
    creator = created;
  }

  await setSession({
    wallet: session.wallet,
    role: "creator",
    creatorId: creator.id,
    issuedAt: Date.now(),
  });

  return NextResponse.json({ creator });
}
