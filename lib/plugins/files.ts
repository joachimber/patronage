import { z } from "zod";
import { definePlugin } from "./types";

const config = z.object({
  fileId: z.string().uuid(),
  filename: z.string().min(1).max(256),
  label: z.string().max(120).optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
});

type Cfg = z.infer<typeof config>;

/**
 * Files plugin — access is gated at stream time, not grant time.
 * `/api/files/[id]/stream` re-checks the session wallet's on-chain balance
 * against the tier threshold on every request, so there's no externalRef to
 * persist and nothing to revoke: a sell below threshold immediately blocks
 * the download.
 */
export const filesPlugin = definePlugin<Cfg>({
  id: "files",
  label: "File downloads",
  tagline: "Signed downloads, holder-verified",
  description:
    "Upload a file. Holders of this tier download it from a route that re-reads on-chain balance on every download click — stale links don't exist.",
  configSchema: config,

  async onGrant() {
    return {};
  },
  async onRevoke() {
    // No-op — gated per-request, not per-grant.
  },
});
