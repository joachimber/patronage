# Patronage

**Turn a Bags token into a membership.** Holders unlock tiers automatically based on how much of the ticker they hold — file downloads, gated pages, private channels. If they sell, access revokes on its own.

**Live at [joinpatronage.xyz](https://joinpatronage.xyz).** Token: [`$PATRONAGE`](https://bags.fm/4oGHFuYTMqHgZX9vmPGytAyZq9mjTG7cRs9Zyp3eBAGS) (`4oGHFuYTMqHgZX9vmPGytAyZq9mjTG7cRs9Zyp3eBAGS`).

## Why

Bags makes it easy to launch a token. After that — nothing. No built-in way to say "if you hold this much of my ticker, you get this file / this page / this channel." Patronage is that missing layer: plug your mint in, define tiers with thresholds and perks, share the link.

Holders connect a wallet, sign a message (free, no transaction), and get their tier on the spot. Every time they touch a gated resource, the site re-reads their balance from Solana and adjusts. Sell and lose access in the same request.

## What a creator does

1. Visit your Bags token page on Patronage (e.g. `/t/<mint>`).
2. Click **Claim as the creator** and sign a nonce with the fee-claimer wallet. Ownership is verified against the Bags SDK.
3. Design 1–N tiers — each has a name, a token-balance threshold, and a set of perks attached.
4. Share `/c/<handle>` with holders. That's it.

## What a holder does

1. Visit the creator's page.
2. Connect wallet, sign a message (free, no transaction).
3. Tiers at or below their current balance unlock immediately. Holdings are verified live from Solana RPC — no claims DB, no trust.

## Perks available today

- **Gated web content** — unlisted video/article embeds that the server only renders for verified holders.
- **File downloads** — short-TTL signed URLs backed by Cloudflare R2, re-verified on every stream.
- **Telegram & email** — interfaces exist, integrations shipping next.

The plugin architecture means new perks are a single file that implements `onGrant / onRevoke / verify` and a Zod config schema — see [`lib/plugins/`](lib/plugins).

## `$PATRONAGE` mechanic

Creators who launch their token through the Patronage UI route a small partner fee (`PATRONAGE_PARTNER_BPS`, default 100 = 1%) to the treasury. Creators who hold ≥ `PATRONAGE_WAIVER_THRESHOLD` (default 10,000) `$PATRONAGE` get that partner fee waived on their own token. Fully on-chain, auditable via Bags — no off-chain billing.

## Stack

- Next.js 16 (App Router, strict TS)
- Postgres + Drizzle ORM
- `@solana/web3.js` + Helius RPC for live holder lookups
- `@bagsfm/bags-sdk` for token launch + partner config + creator verification
- Cloudflare R2 for file storage (S3-compatible, free egress)
- Tailwind 4 with a hand-authored design system — no component library
- iron-session cookies + ed25519 wallet signatures for auth
- Vercel for hosting

## Running locally

```bash
npm install
cp .env.example .env.local    # fill in real values
npm run db:migrate
npm run dev
```

Required env vars (see [`.env.example`](.env.example)):

| Var | What it is |
|---|---|
| `BAGS_API_KEY` | From [dev.bags.fm](https://dev.bags.fm) |
| `HELIUS_RPC_URL` | Mainnet RPC with DAS enabled |
| `DATABASE_URL` | Postgres (Railway, Neon, or local) |
| `SESSION_SECRET` | 32+ random bytes |
| `R2_*` | Cloudflare R2 credentials for file hosting |
| `PATRONAGE_MINT` | `4oGHFuYTMqHgZX9vmPGytAyZq9mjTG7cRs9Zyp3eBAGS` |

## Submitted to

[Bags Hackathon](https://bags.fm) — Bags API track.

## License

MIT.
