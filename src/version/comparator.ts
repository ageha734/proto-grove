import type { VersionConstraint } from "../parser/constraint.ts";

export type UpdateType = "major" | "minor" | "patch";

export interface UpdateInfo {
  tool: string;
  currentVersion: string;
  latestVersion: string;
  updateType: UpdateType;
  constraint: VersionConstraint;
  newConstraintValue: string;
}

export function isOutdated(current: string, latest: string): boolean {
  if (!current || !latest) return false;
  if (current === latest) return false;

  const currentParts = normalizeVersion(current);
  const latestParts = normalizeVersion(latest);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const c = currentParts[i] ?? 0;
    const l = latestParts[i] ?? 0;
    if (l > c) return true;
    if (l < c) return false;
  }

  return false;
}

export function detectUpdateType(current: string, latest: string): UpdateType {
  const currentParts = normalizeVersion(current);
  const latestParts = normalizeVersion(latest);

  if ((latestParts[0] ?? 0) !== (currentParts[0] ?? 0)) return "major";
  if ((latestParts[1] ?? 0) !== (currentParts[1] ?? 0)) return "minor";
  return "patch";
}

function normalizeVersion(version: string): number[] {
  return version
    .replace(/^v/, "")
    .split(".")
    .map((p) => {
      const n = parseInt(p, 10);
      return isNaN(n) ? 0 : n;
    });
}
