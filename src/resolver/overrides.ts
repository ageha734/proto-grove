import type { ResolvedRepo } from "./mod.ts";
import type { Config } from "../config.ts";

export function resolveFromOverrides(
  toolName: string,
  config: Config,
): ResolvedRepo | null {
  const override = config.repos[toolName];
  if (!override) return null;

  const parts = override.split("/");
  if (parts.length !== 2) return null;

  return { owner: parts[0], repo: parts[1] };
}
