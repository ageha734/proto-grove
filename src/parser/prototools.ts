import { parse as parseToml } from "@std/toml";
import { parseConstraint, type VersionConstraint } from "./constraint.ts";

export interface ToolEntry {
  name: string;
  constraint: VersionConstraint;
  pluginUrl: string | null;
}

export interface PrototoolsFile {
  tools: ToolEntry[];
  plugins: Record<string, string>;
}

export function parsePrototools(content: string): PrototoolsFile {
  const parsed = parseToml(content) as Record<string, unknown>;

  const plugins = (parsed["plugins"] as Record<string, string>) ?? {};
  const settings = ["plugins", "settings"];

  const tools: ToolEntry[] = [];

  for (const [key, value] of Object.entries(parsed)) {
    if (settings.includes(key) || typeof value !== "string") {
      continue;
    }

    const constraint = parseConstraint(value);
    const pluginUrl = plugins[key] ?? null;

    tools.push({
      name: key,
      constraint,
      pluginUrl,
    });
  }

  return { tools, plugins };
}
