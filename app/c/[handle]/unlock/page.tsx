import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container } from "@/components/container";
import { db } from "@/lib/db/client";
import { creators, tiers, holders } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { UnlockClient } from "./client";

export default async function UnlockPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  const [creator] = await db()
    .select()
    .from(creators)
    .where(eq(creators.handle, handle));
  if (!creator) notFound();

  const creatorTiers = await db()
    .select()
    .from(tiers)
    .where(eq(tiers.creatorId, creator.id))
    .orderBy(tiers.position);

  const session = await getSession();
  let initialHolder: {
    balance: string;
    currentTierId: string | null;
    currentTierName: string | null;
  } | null = null;

  if (session.wallet) {
    const [h] = await db()
      .select()
      .from(holders)
      .where(eq(holders.wallet, session.wallet));
    if (h && h.creatorId === creator.id) {
      const tier = h.currentTierId
        ? creatorTiers.find((t) => t.id === h.currentTierId)
        : null;
      initialHolder = {
        balance: h.lastBalance?.toString() ?? "0",
        currentTierId: h.currentTierId,
        currentTierName: tier?.name ?? null,
      };
    }
  }

  return (
    <>
      <Nav />
      <Container size="wide">
        <div className="pt-14 pb-12">
          <Link
            href={`/c/${creator.handle}`}
            className="f-label hover:text-vermillion mb-6 inline-block"
          >
            ← {creator.displayName}
          </Link>

          <div
            className="f-label mb-3"
            style={{ color: "var(--ink-faint)" }}
          >
            Unlock tiers
          </div>
          <h1 className="f-display text-[clamp(40px,7vw,80px)]">
            Verify your holdings.
          </h1>
          <p
            className="mt-6 f-body text-[17px] max-w-[620px]"
            style={{ color: "var(--ink-soft)" }}
          >
            Connect the wallet that holds{" "}
            <span className="f-mono text-[14px]">
              ${creator.tokenTicker ?? "TOKEN"}
            </span>
            . Sign a short message. We read your balance from Solana and unlock
            the highest tier you qualify for.
          </p>

          <div className="mt-12">
            <UnlockClient
              handle={creator.handle}
              tokenTicker={creator.tokenTicker ?? "TOKEN"}
              tokenMint={creator.tokenMint}
              accentColor={creator.accentColor ?? "#C1272D"}
              initialHolder={initialHolder}
              signedInWallet={session.wallet ?? null}
              tiers={creatorTiers.map((t) => ({
                id: t.id,
                name: t.name,
                threshold: t.threshold.toString(),
                position: t.position,
              }))}
            />
          </div>
        </div>
      </Container>
      <Footer />
    </>
  );
}
