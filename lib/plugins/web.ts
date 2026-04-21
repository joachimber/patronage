import { z } from "zod";
import { definePlugin } from "./types";

const config = z.object({
  kind: z.enum(["youtube", "notion", "video", "iframe"]),
  url: z.string().url(),
  title: z.string().optional(),
  description: z.string().optional(),
});

type Cfg = z.infer<typeof config>;

/**
 * Web-content plugin — no-op at grant/revoke time. Access is enforced at
 * render time on /c/[handle]/t/[tierId] via server-side session + balance
 * re-verification, not by storing any server-side "access token".
 *
 * Benefit: no leak surface; the URL is never revealed to non-holders, and
 * the iframe is sandboxed. Revocation is automatic the instant the
 * re-verify cron re-sets `holders.currentTierId`.
 */
export const webPlugin = definePlugin<Cfg>({
  id: "web",
  label: "Web content",
  tagline: "Gated embeds",
  description:
    "Wrap unlisted YouTube, Notion, or self-hosted video in a holder-verified iframe. Balance is checked server-side when a holder opens the tier.",
  configSchema: config,

  async onGrant() {
    return {};
  },
  async onRevoke() {
    // Nothing persistent to revoke — access is render-time.
  },
});
