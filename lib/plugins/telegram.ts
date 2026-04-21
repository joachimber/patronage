import { z } from "zod";
import { definePlugin } from "./types";

export const telegramPlugin = definePlugin({
  id: "telegram",
  label: "Telegram",
  tagline: "Channel invites",
  description: "Single-use invite links, revoked on sell.",
  comingSoon: true,
  configSchema: z.object({}),
  async onGrant() {
    throw new Error("Telegram plugin is not yet live.");
  },
  async onRevoke() {},
});
