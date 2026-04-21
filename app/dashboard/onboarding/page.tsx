import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { OnboardingForm } from "./form";
import { db } from "@/lib/db/client";
import { creators } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { shortAddress } from "@/lib/auth/format";
import {
  isLikelySolanaMint,
  mintTicker,
  mintName,
  getMintMeta,
  shortMint,
} from "@/lib/bags-mints";
import { getAssetMetadata } from "@/lib/helius";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ mint?: string }>;
}) {
  const session = await getSession();
  if (!session.wallet) redirect("/dashboard/connect");

  const sp = await searchParams;
  const linkMint = sp.mint && isLikelySolanaMint(sp.mint) ? sp.mint : null;

  let linkMeta: { ticker: string; name: string; image: string | null } | null = null;
  if (linkMint) {
    const seed = getMintMeta(linkMint);
    const live = seed ? null : await getAssetMetadata(linkMint).catch(() => null);
    linkMeta = {
      ticker: (seed?.symbol?.trim() || live?.symbol || mintTicker(linkMint)).toUpperCase(),
      name: seed?.name?.trim() || live?.name || mintName(linkMint),
      image: seed?.image || live?.image || null,
    };
  }

  const [existing] = await db()
    .select()
    .from(creators)
    .where(eq(creators.wallet, session.wallet));

  return (
    <Container size="narrow">
      <div className="pt-14 pb-20">
        <div className="f-label mb-3" style={{ color: "var(--ink-faint)" }}>
          {linkMint ? "Claim your token" : "Create your profile"}
        </div>
        <h1 className="f-display text-[clamp(40px,6vw,72px)]">
          {linkMint ? "Claim ${ticker} as the creator.".replace("${ticker}", linkMeta!.ticker) : "Your creator profile."}
        </h1>
        <p
          className="mt-6 f-body text-[17px] max-w-[560px]"
          style={{ color: "var(--ink-soft)" }}
        >
          {linkMint
            ? `Set up the public page for ${linkMeta!.name}. Holders of $${linkMeta!.ticker} will unlock tiers here automatically.`
            : "This is what holders see on your page. Pick a handle, a display name, and a one-liner. You can edit any of it later."}
        </p>

        <div className="mt-6 flex items-center gap-3">
          <span
            className="w-[7px] h-[7px] rounded-full"
            style={{ background: "var(--vermillion)" }}
            aria-hidden
          />
          <span className="f-mono text-[12px]">
            Signed in as {shortAddress(session.wallet)}
          </span>
        </div>

        {linkMint && linkMeta && (
          <div
            className="mt-8 flex items-center gap-4 p-4 rounded-[var(--radius-md)]"
            style={{ background: "var(--bags-soft)" }}
          >
            {linkMeta.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={linkMeta.image}
                alt=""
                className="w-[48px] h-[48px] rounded-full object-cover shrink-0"
                style={{ background: "var(--bone-deep)" }}
              />
            ) : (
              <div
                className="w-[48px] h-[48px] rounded-full shrink-0 flex items-center justify-center f-display text-[16px]"
                style={{ background: "var(--bags)", color: "var(--ink)" }}
              >
                {linkMeta.ticker.slice(0, 2)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="f-label" style={{ color: "var(--bags-deep)" }}>
                Linking ${linkMeta.ticker}
              </div>
              <div
                className="f-mono text-[11px] truncate mt-1"
                style={{ color: "var(--ink-soft)" }}
              >
                {shortMint(linkMint, 6, 6)}
              </div>
            </div>
          </div>
        )}

        <div className="mt-12">
          <OnboardingForm
            linkMint={linkMint}
            linkTicker={linkMeta?.ticker ?? null}
            initial={
              existing
                ? {
                    handle: existing.handle,
                    displayName: existing.displayName,
                    tagline: existing.tagline ?? "",
                    bio: existing.bio ?? "",
                    accentColor: existing.accentColor ?? "#C1272D",
                  }
                : linkMeta
                  ? {
                      handle: "",
                      displayName: linkMeta.name,
                      tagline: "",
                      bio: "",
                      accentColor: "#C1272D",
                    }
                  : undefined
            }
          />
        </div>
      </div>
    </Container>
  );
}
