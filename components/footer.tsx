import Link from "next/link";
import { Seal } from "./seal";
import { Container } from "./container";
import { PATRONAGE_MINT_ADDRESS, shortMint } from "@/lib/bags-mints";

export function Footer() {
  return (
    <footer className="mt-32">
      <div className="rule-h" />
      <Container size="wide">
        <div className="py-12 grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-5">
            <Seal size={32} label={false} />
            <p className="mt-5 f-body text-[15px] max-w-[360px]" style={{ color: "var(--ink-soft)" }}>
              A creator toolkit for Bags tokens. Package gated content,
              downloads, and perks into tiers — your ticker becomes the key.
            </p>
          </div>
          <div className="col-span-6 md:col-span-3">
            <div className="f-label mb-4" style={{ color: "var(--ink-faint)" }}>
              Product
            </div>
            <ul className="space-y-2">
              <li><Link href="/dashboard" className="f-body text-[15px] hover:text-bags-deep">For creators</Link></li>
              <li><Link href="/#discover" className="f-body text-[15px] hover:text-bags-deep">Discover tokens</Link></li>
            </ul>
          </div>
          <div className="col-span-6 md:col-span-4">
            <div className="f-label mb-4" style={{ color: "var(--ink-faint)" }}>
              Plugins
            </div>
            <ul className="space-y-2 f-body text-[15px]" style={{ color: "var(--ink-soft)" }}>
              <li>Gated web content <span className="f-label" style={{ color: "var(--bags-deep)" }}>live</span></li>
              <li>Signed downloads <span className="f-label" style={{ color: "var(--bags-deep)" }}>live</span></li>
              <li style={{ color: "var(--ink-faint)" }}>Telegram <span className="f-label">soon</span></li>
              <li style={{ color: "var(--ink-faint)" }}>Email <span className="f-label">soon</span></li>
            </ul>
          </div>
        </div>
      </Container>
      <div className="rule-h" />
      <Container size="wide">
        <div className="py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="f-label" style={{ color: "var(--ink-faint)" }}>
              © 2026 Patronage
            </span>
            <span
              className="f-mono text-[11px]"
              style={{ color: "var(--ink-faint)" }}
              aria-hidden
            >
              ·
            </span>
            <Link
              href={`/t/${PATRONAGE_MINT_ADDRESS}`}
              className="inline-flex items-center gap-2 f-label hover:text-bags-deep transition-colors"
              style={{ color: "var(--ink)" }}
            >
              <span
                className="inline-block w-[6px] h-[6px] rounded-full"
                style={{ background: "var(--bags)" }}
                aria-hidden
              />
              $PATRONAGE
              <span
                className="f-mono text-[11px]"
                style={{ color: "var(--ink-faint)" }}
              >
                {shortMint(PATRONAGE_MINT_ADDRESS, 4, 4)}
              </span>
            </Link>
          </div>
          <a
            href="https://bags.fm"
            className="f-label"
            style={{ color: "var(--ink-faint)" }}
          >
            Built on Bags
          </a>
        </div>
      </Container>
    </footer>
  );
}
