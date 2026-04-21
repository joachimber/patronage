import { NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { nonces } from "@/lib/db/schema";
import { buildMessage, makeNonce } from "@/lib/auth/wallet";
import { env } from "@/lib/env";

const NONCE_TTL_MS = 5 * 60 * 1000;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const wallet = typeof body?.wallet === "string" ? body.wallet.trim() : "";
  if (!wallet || wallet.length < 32 || wallet.length > 64) {
    return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });
  }

  const nonce = makeNonce();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + NONCE_TTL_MS);

  await db()
    .delete(nonces)
    .where(and(eq(nonces.wallet, wallet), lt(nonces.expiresAt, now)));

  await db().insert(nonces).values({ wallet, nonce, expiresAt });

  const domain = new URL(env.APP_URL).host;
  const message = buildMessage({
    statement:
      "Sign this message to prove you control this wallet. Signing is free and does not approve any transaction.",
    domain,
    nonce,
    wallet,
    issuedAt: now.toISOString(),
  });

  return NextResponse.json({ nonce, message, expiresAt: expiresAt.toISOString() });
}
