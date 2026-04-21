import { z } from "zod";
import { definePlugin } from "./types";

export const emailPlugin = definePlugin({
  id: "email",
  label: "Email",
  tagline: "Audience sync",
  description: "Auto-add holders to Resend or Substack audiences.",
  comingSoon: true,
  configSchema: z.object({}),
  async onGrant() {
    throw new Error("Email plugin is not yet live.");
  },
  async onRevoke() {},
});
