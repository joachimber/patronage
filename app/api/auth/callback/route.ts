import { NextResponse } from "next/server";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { creators, nonces } from "@/lib/db/schema";
import { verifyWalletSignature } from "@/lib/auth/wallet";
import { setSession } from "@/lib/auth/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const wallet = typeof body?.wallet === "string" ? body.wallet.trim() : "";
  const signature =
    typeof body?.signature === "string" ? body.signature.trim() : "";
  const message = typeof body?.message === "string" ? body.message : "";

  if (!wallet || !signature || !message) {
    return NextResponse.json(
      { error: "Missing wallet, signature, or message" },
      { status: 400 },
    );
  }

  const nonceLine = message
    .split("\n")
    .find((l: string) => l.startsWith("Nonce:"));
  const nonce = nonceLine?.split(":").slice(1).join(":").trim() ?? "";
  if (!nonce) {
    return NextResponse.json({ error: "Malformed message" }, { status: 400 });
  }

  const now = new Date();
  const [record] = await db()
    .select()
    .from(nonces)
    .where(
      and(
        eq(nonces.wallet, wallet),
        eq(nonces.nonce, nonce),
        gte(nonces.expiresAt, now),
      ),
    );
  if (!record) {
    return NextResponse.json(
      { error: "Nonce expired or unknown" },
      { status: 401 },
    );
  }

  const valid = verifyWalletSignature({
    message,
    signatureBs58: signature,
    walletBs58: wallet,
  });
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Burn the nonce — single-use only.
  await db()
    .delete(nonces)
    .where(and(eq(nonces.wallet, wallet), eq(nonces.nonce, nonce)));

  // Creator role if this wallet owns a creator profile.
  const [creator] = await db()
    .select({ id: creators.id })
    .from(creators)
    .where(eq(creators.wallet, wallet));

  await setSession({
    wallet,
    role: creator ? "creator" : "holder",
    creatorId: creator?.id,
    issuedAt: Date.now(),
  });

  return NextResponse.json({
    ok: true,
    wallet,
    role: creator ? "creator" : "holder",
    creatorId: creator?.id ?? null,
  });
}
