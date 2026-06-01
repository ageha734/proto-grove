import { resolveFromPluginUrl } from "./plugin-toml.ts";
import { resolveFromOverrides } from "./overrides.ts";
import { resolveFromSearch } from "./search.ts";
import type { ToolEntry } from "../parser/prototools.ts";
import type { Config } from "../config.ts";

export interface ResolvedRepo {
  owner: string;
  repo: string;
}

export async function resolveRepo(
  tool: ToolEntry,
  config: Config,
  token: string,
): Promise<ResolvedRepo | null> {
  const overrideResult = resolveFromOverrides(tool.name, config);
  if (overrideResult) return overrideResult;

  if (tool.pluginUrl) {
    const pluginResult = await resolveFromPluginUrl(tool.pluginUrl);
    if (pluginResult) return pluginResult;
  }

  const searchResult = await resolveFromSearch(tool.name, token);
  return searchResult;
}
