import { redirect } from "next/navigation";
import { Container } from "@/components/container";
import { ConnectButton } from "@/components/connect-button";
import { getSession } from "@/lib/auth/session";

export default async function ConnectPage() {
  const session = await getSession();
  if (session.wallet) redirect("/dashboard");

  return (
    <>
      <Container size="wide">
        <div className="grid grid-cols-12 gap-8 pt-16 pb-32">
          <div className="col-span-12 md:col-span-7">
            <div className="f-label mb-4" style={{ color: "var(--ink-faint)" }}>
              Creator sign-in
            </div>
            <h1 className="f-display text-[clamp(40px,6vw,72px)]">
              Connect your wallet.
            </h1>
            <p
              className="mt-6 f-body text-[18px] max-w-[560px]"
              style={{ color: "var(--ink-soft)" }}
            >
              Sign a short message to prove you own the wallet. No approval, no
              transaction, no SOL spent. We set an httpOnly session cookie and
              you&apos;re in.
            </p>
            <div className="mt-10">
              <ConnectButton
                label="Connect Phantom / Solflare"
                variant="ink"
                size="lg"
              />
            </div>
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-[640px]">
              <Tip n="01" title="Ed25519 signature">
                We verify the signature server-side, burn the nonce, and set an
                httpOnly session cookie.
              </Tip>
              <Tip n="02" title="Free to sign">
                Signing a message costs no SOL. We never request approval for
                value to move.
              </Tip>
              <Tip n="03" title="Creator or holder">
                The same sign-in works for both. Your role is inferred from
                whether this wallet owns a creator profile.
              </Tip>
            </div>
          </div>

          <aside className="col-span-12 md:col-span-4 md:col-start-9">
            <div className="p-8 border border-rule relative">
              <div className="absolute -top-[1px] -left-[1px] -right-[1px] rule-thick" />
              <div
                className="f-label mb-4"
                style={{ color: "var(--ink-faint)" }}
              >
                What you get
              </div>
              <ul className="space-y-4 f-body text-[15px]">
                <li className="flex gap-3">
                  <span
                    className="f-mono text-[11px] mt-[2px]"
                    style={{ color: "var(--vermillion)" }}
                  >
                    ──
                  </span>
                  Launch your Bags token through Patronage with fee-share
                  partner config already wired.
                </li>
                <li className="flex gap-3">
                  <span
                    className="f-mono text-[11px] mt-[2px]"
                    style={{ color: "var(--vermillion)" }}
                  >
                    ──
                  </span>
                  Design holding-threshold tiers. Drag to reorder, inline-edit
                  names and thresholds.
                </li>
                <li className="flex gap-3">
                  <span
                    className="f-mono text-[11px] mt-[2px]"
                    style={{ color: "var(--vermillion)" }}
                  >
                    ──
                  </span>
                  Attach perks to any tier — gated content, signed downloads,
                  and more. Patronage revokes automatically on sell.
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}

function Tip({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span
          className="f-mono text-[11px]"
          style={{ color: "var(--vermillion)" }}
        >
          {n}
        </span>
        <div className="f-label" style={{ color: "var(--ink)" }}>
          {title}
        </div>
      </div>
      <p
        className="mt-2 f-body text-[14px]"
        style={{ color: "var(--ink-soft)" }}
      >
        {children}
      </p>
    </div>
  );
}
