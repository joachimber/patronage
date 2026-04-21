import Link from "next/link";
import { Seal } from "./seal";
import { Container } from "./container";
import { PATRONAGE_MINT_ADDRESS } from "@/lib/bags-mints";

export function Nav({
  variant = "public",
}: {
  variant?: "public" | "dashboard";
}) {
  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 z-40 bg-bone/80 backdrop-blur-[6px]"
    >
      <div className="rule-h" />
      <Container size="wide">
        <div className="flex items-center justify-between h-[58px]">
          <Link
            href="/"
            className="flex items-center gap-3 group"
            aria-label="Patronage home"
          >
            <Seal size={24} label={false} />
            <span className="f-headline text-[17px]" style={{ color: "var(--ink)" }}>
              Patronage
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-6">
            {variant === "public" ? (
              <>
                <Link
                  href="/#discover"
                  className="f-label hidden sm:inline hover:text-bags-deep transition-colors"
                  style={{ color: "var(--ink)" }}
                >
                  Discover
                </Link>
                <Link
                  href={`/t/${PATRONAGE_MINT_ADDRESS}`}
                  className="f-label hidden sm:inline-flex items-center gap-[6px] hover:text-bags-deep transition-colors"
                  style={{ color: "var(--ink)" }}
                  aria-label="View $PATRONAGE token"
                >
                  <span
                    className="inline-block w-[6px] h-[6px] rounded-full"
                    style={{ background: "var(--bags)" }}
                    aria-hidden
                  />
                  $PATRONAGE
                </Link>
                <Link
                  href="/dashboard"
                  className="f-label inline-flex items-center h-9 px-4 rounded-full bg-bags text-ink hover:bg-bags-dim transition-colors"
                >
                  For creators
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard/tiers"
                  className="f-label hover:text-bags-deep transition-colors"
                >
                  Tiers
                </Link>
                <Link
                  href="/dashboard/token"
                  className="f-label hover:text-bags-deep transition-colors"
                >
                  Token
                </Link>
              </>
            )}
          </div>
        </div>
      </Container>
      <div className="rule-h" />
    </nav>
  );
}
