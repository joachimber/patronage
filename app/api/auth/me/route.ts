import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session.wallet) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({
    authenticated: true,
    wallet: session.wallet,
    role: session.role,
    creatorId: session.creatorId ?? null,
  });
}
