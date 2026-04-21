import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { creators } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { prepareLaunch } from "@/lib/bags";
import { env } from "@/lib/env";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  symbol: z.string().trim().min(1).max(12).toUpperCase(),
  description: z.string().trim().min(1).max(2000),
  imageUrl: z.string().url(),
  partnerBps: z.number().int().min(0).max(2000).optional(),
  website: z.string().url().optional(),
  twitter: z.string().trim().max(120).optional(),
  telegram: z.string().trim().max(120).optional(),
  initialBuyLamports: z.number().int().min(0).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.wallet || !session.creatorId) {
    return NextResponse.json({ error: "Not a creator" }, { status: 401 });
  }
  const [creator] = await db()
    .select()
    .from(creators)
    .where(eq(creators.id, session.creatorId));
  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }
  if (creator.tokenMint) {
    return NextResponse.json(
      { error: "Creator already has a launched token" },
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

  // Partner routing: every creator token launched via Patronage sends BPS
  // to $PATRONAGE treasury. If $PATRONAGE is launched, its mint goes here;
  // otherwise route to the treasury wallet directly.
  const patronageMint = env.PATRONAGE_MINT;
  const partnerBps = parsed.data.partnerBps ?? env.PATRONAGE_PARTNER_BPS;

  const creatorBps = 10_000 - partnerBps;
  const feeClaimers: Array<{ user: string; userBps: number }> = [
    { user: session.wallet, userBps: creatorBps },
  ];
  if (partnerBps > 0 && patronageMint) {
    feeClaimers.push({ user: patronageMint, userBps: partnerBps });
  } else if (partnerBps > 0) {
    // Pre-$PATRONAGE: route the BPS to the creator too, so the launch is
    // still valid (sum to 10000). We'll rewire to treasury once PATRONAGE_MINT
    // is set in env.
    feeClaimers[0].userBps = 10_000;
  }

  const prepared = await prepareLaunch({
    name: parsed.data.name,
    symbol: parsed.data.symbol,
    description: parsed.data.description,
    imageUrl: parsed.data.imageUrl,
    creatorWallet: session.wallet,
    feeClaimers,
    initialBuyLamports: parsed.data.initialBuyLamports,
    website: parsed.data.website,
    twitter: parsed.data.twitter,
    telegram: parsed.data.telegram,
  });

  // Serialise the unsigned transaction for the browser to deserialize + sign.
  const txBase64 = Buffer.from(prepared.transaction.serialize()).toString(
    "base64",
  );

  return NextResponse.json({
    tokenMint: prepared.tokenMint,
    configKey: prepared.configKey,
    metadataUrl: prepared.metadataUrl,
    tx: txBase64,
    partnerBps: patronageMint ? partnerBps : 0,
    symbol: parsed.data.symbol,
    name: parsed.data.name,
  });
}
