import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { prepareLaunch } from "@/lib/bags";
import { env } from "@/lib/env";

/**
 * One-shot $PATRONAGE launch. This differs from the creator token launch in
 * one way: fee claimers point to *our* treasury wallet (the signed-in admin)
 * at 100%, because $PATRONAGE itself has no partner upstream.
 */

const schema = z.object({
  name: z.string().trim().min(1).max(80).default("Patronage"),
  symbol: z.string().trim().min(1).max(12).default("PATRONAGE"),
  description: z.string().trim().min(1).max(2000),
  imageUrl: z.string().url(),
  website: z.string().url().optional(),
  twitter: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.wallet) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Only the wallet listed in PATRONAGE_ADMIN_WALLET can launch $PATRONAGE.
  // Prevents someone with a session from burning SOL on our behalf.
  const adminWallet = process.env.PATRONAGE_ADMIN_WALLET;
  if (adminWallet && adminWallet !== session.wallet) {
    return NextResponse.json(
      { error: "Only the Patronage admin wallet can launch $PATRONAGE" },
      { status: 403 },
    );
  }

  if (env.PATRONAGE_MINT) {
    return NextResponse.json(
      { error: "PATRONAGE_MINT is already set — $PATRONAGE is launched." },
      { status: 409 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const prepared = await prepareLaunch({
    name: parsed.data.name,
    symbol: parsed.data.symbol,
    description: parsed.data.description,
    imageUrl: parsed.data.imageUrl,
    creatorWallet: session.wallet,
    feeClaimers: [{ user: session.wallet, userBps: 10_000 }],
    website: parsed.data.website,
    twitter: parsed.data.twitter,
  });

  const txBase64 = Buffer.from(prepared.transaction.serialize()).toString(
    "base64",
  );

  return NextResponse.json({
    tokenMint: prepared.tokenMint,
    configKey: prepared.configKey,
    metadataUrl: prepared.metadataUrl,
    tx: txBase64,
    symbol: parsed.data.symbol,
    name: parsed.data.name,
  });
}
