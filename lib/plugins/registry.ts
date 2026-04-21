import type { Plugin, PluginId } from "./types";
import { webPlugin } from "./web";
import { filesPlugin } from "./files";
import { telegramPlugin } from "./telegram";
import { emailPlugin } from "./email";

export const plugins: Record<PluginId, Plugin<unknown>> = {
  web: webPlugin as Plugin<unknown>,
  files: filesPlugin as Plugin<unknown>,
  telegram: telegramPlugin as Plugin<unknown>,
  email: emailPlugin as Plugin<unknown>,
};

export const pluginList = Object.values(plugins);

export function getPlugin(id: PluginId): Plugin<unknown> {
  const p = plugins[id];
  if (!p) throw new Error(`Unknown plugin: ${id}`);
  return p;
}
