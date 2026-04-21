import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container } from "@/components/container";
import { Seal } from "@/components/seal";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { LaunchPatronageForm } from "./form";

export const dynamic = "force-dynamic";

export default async function LaunchPatronagePage() {
  const session = await getSession();
  if (!session.wallet) redirect("/dashboard/connect");

  const adminWallet = process.env.PATRONAGE_ADMIN_WALLET;
  if (adminWallet && adminWallet !== session.wallet) {
    return (
      <>
        <Nav />
        <Container size="narrow">
          <div className="py-24 text-center">
            <h1 className="f-display text-[48px]">Access denied.</h1>
            <p
              className="f-body text-[16px] mt-5"
              style={{ color: "var(--ink-soft)" }}
            >
              Launch of $PATRONAGE is restricted to the Patronage admin
              wallet.
            </p>
          </div>
        </Container>
        <Footer />
      </>
    );
  }

  let patronageMint: string | null = null;
  try {
    patronageMint = env.PATRONAGE_MINT ?? null;
  } catch {
    patronageMint = null;
  }

  return (
    <>
      <Nav />
      <Container size="wide">
        <div className="pt-14 pb-10">
          <div
            className="f-label mb-3"
            style={{ color: "var(--ink-faint)" }}
          >
            Admin · $PATRONAGE
          </div>
          <h1 className="f-display text-[clamp(44px,7vw,88px)]">
            Launch $PATRONAGE.
          </h1>
          <p
            className="mt-6 f-body text-[17px] max-w-[680px]"
            style={{ color: "var(--ink-soft)" }}
          >
            One-time mainnet issuance. $PATRONAGE is the fee rail for every
            Patronage-launched token — creators route a small BPS here, on-chain.
            Creators above the waiver threshold launch with partner fee set to
            zero.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <Seal size={56} />
            <div
              className="f-mono text-[12px]"
              style={{ color: "var(--ink-faint)" }}
            >
              {patronageMint
                ? `Mint live · ${patronageMint}`
                : "Mint not launched yet"}
            </div>
          </div>
        </div>

        <div className="rule-h" />

        <div className="py-12">
          {patronageMint ? (
            <div className="border border-rule p-8 max-w-[720px]">
              <div
                className="f-label mb-3"
                style={{ color: "var(--vermillion)" }}
              >
                Already launched
              </div>
              <div className="f-display text-[44px]">$PATRONAGE</div>
              <div
                className="f-mono text-[13px] mt-3 break-all"
                style={{ color: "var(--ink-soft)" }}
              >
                Mint · {patronageMint}
              </div>
              <a
                href={`https://bags.fm/token/${patronageMint}`}
                target="_blank"
                rel="noreferrer"
                className="mt-6 f-label inline-flex items-center h-10 px-4 border border-ink hover:bg-ink hover:text-bone"
              >
                View on Bags →
              </a>
            </div>
          ) : (
            <LaunchPatronageForm
              signedInWallet={session.wallet}
              rpcUrl={process.env.NEXT_PUBLIC_SOLANA_RPC ?? ""}
            />
          )}
        </div>
      </Container>
      <Footer />
    </>
  );
}
