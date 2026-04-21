/**
 * Typed environment access. All server-side env vars go through here.
 * Client-side `NEXT_PUBLIC_*` values are imported directly in the components
 * that need them (Next inlines them at build time).
 */

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export const env = {
  get BAGS_API_KEY() {
    return req("BAGS_API_KEY");
  },
  get HELIUS_RPC_URL() {
    return req("HELIUS_RPC_URL");
  },
  get DATABASE_URL() {
    return req("DATABASE_URL");
  },
  get SESSION_SECRET() {
    const s = req("SESSION_SECRET");
    if (s.length < 32) throw new Error("SESSION_SECRET must be >= 32 chars");
    return s;
  },
  get PATRONAGE_MINT() {
    return optional("PATRONAGE_MINT");
  },
  get PATRONAGE_PARTNER_BPS() {
    return Number(optional("PATRONAGE_PARTNER_BPS") ?? "100");
  },
  get PATRONAGE_WAIVER_THRESHOLD() {
    return BigInt(optional("PATRONAGE_WAIVER_THRESHOLD") ?? "10000");
  },
  get APP_URL() {
    return optional("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3005";
  },
  get CRON_SECRET() {
    return optional("CRON_SECRET");
  },
  get R2_ACCOUNT_ID() {
    return optional("R2_ACCOUNT_ID");
  },
  get R2_ACCESS_KEY_ID() {
    return optional("R2_ACCESS_KEY_ID");
  },
  get R2_SECRET_ACCESS_KEY() {
    return optional("R2_SECRET_ACCESS_KEY");
  },
  get R2_BUCKET() {
    return optional("R2_BUCKET") ?? "patronage-files";
  },
  get R2_ENDPOINT() {
    const explicit = optional("R2_ENDPOINT");
    if (explicit) return explicit;
    const acct = optional("R2_ACCOUNT_ID");
    return acct ? `https://${acct}.r2.cloudflarestorage.com` : undefined;
  },
};
