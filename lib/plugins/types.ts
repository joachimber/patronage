import type { z } from "zod";
import type { Creator, Holder, Tier } from "../db/schema";

export type PluginId = "web" | "files" | "telegram" | "email";

export type GrantStatus = "granted" | "missing" | "error";

export interface GrantCtx<Config = unknown> {
  config: Config;
  holder: Holder;
  tier: Tier;
  creator: Creator;
}

export interface RevokeCtx {
  holder: Holder;
  tier: Tier;
  creator: Creator;
  externalRef?: string;
}

export interface VerifyCtx<Config = unknown> {
  config: Config;
  holder: Holder;
  tier: Tier;
}

export interface Plugin<Config = unknown> {
  id: PluginId;
  label: string;
  tagline: string;
  description: string;
  comingSoon?: boolean;
  configSchema: z.ZodType<Config>;
  onGrant(ctx: GrantCtx<Config>): Promise<{ externalRef?: string }>;
  onRevoke(ctx: RevokeCtx): Promise<void>;
  verify?(ctx: VerifyCtx<Config>): Promise<GrantStatus>;
}

export function definePlugin<Config>(p: Plugin<Config>): Plugin<Config> {
  return p;
}
