import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db } from "@/lib/db/client";
import { creators } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { LaunchForm } from "./form";

export default async function TokenPage() {
  const session = await getSession();
  if (!session.wallet) redirect("/dashboard/connect");
  if (!session.creatorId) redirect("/dashboard/onboarding");

  const [creator] = await db()
    .select()
    .from(creators)
    .where(eq(creators.id, session.creatorId));
  if (!creator) redirect("/dashboard/onboarding");

  const patronageMint = (() => {
    try {
      return env.PATRONAGE_MINT ?? null;
    } catch {
      return null;
    }
  })();

  return (
    <Container size="wide">
      <div className="pt-14 pb-10">
        <div
          className="f-label mb-3"
          style={{ color: "var(--ink-faint)" }}
        >
          Token · @{creator.handle}
        </div>
        <h1 className="f-display text-[clamp(40px,6vw,72px)]">
          Launch your token.
        </h1>
        <p
          className="mt-5 f-body text-[17px] max-w-[620px]"
          style={{ color: "var(--ink-soft)" }}
        >
          Runs the Bags SDK four-step launch: metadata, fee-share config,
          transaction, on-chain submission. You sign once in your wallet; the
          token is live on mainnet.
        </p>
      </div>

      <div className="rule-h" />

      <div className="py-12">
        <LaunchForm
          creatorWallet={creator.wallet}
          existingMint={creator.tokenMint}
          existingTicker={creator.tokenTicker}
          existingName={creator.tokenName}
          defaultName={creator.displayName}
          patronageMint={patronageMint}
          defaultPartnerBps={100}
          rpcUrl={process.env.NEXT_PUBLIC_SOLANA_RPC ?? ""}
        />
      </div>
    </Container>
  );
}
