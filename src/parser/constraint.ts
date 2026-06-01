export type ConstraintKind =
  | "gte"
  | "exact"
  | "major"
  | "major_minor"
  | "stable"
  | "empty";

export interface VersionConstraint {
  raw: string;
  kind: ConstraintKind;
  version: string | null;
}

export function parseConstraint(raw: string): VersionConstraint {
  const trimmed = raw.trim();

  if (trimmed === "" || trimmed === '""') {
    return { raw: trimmed, kind: "empty", version: null };
  }

  if (trimmed === "stable") {
    return { raw: trimmed, kind: "stable", version: null };
  }

  if (trimmed.startsWith(">=")) {
    const version = trimmed.slice(2).trim();
    return { raw: trimmed, kind: "gte", version };
  }

  if (trimmed.startsWith("~") || trimmed.startsWith("^")) {
    const version = trimmed.slice(1).trim();
    return { raw: trimmed, kind: "gte", version };
  }

  const parts = trimmed.split(".");
  if (parts.length === 1 && /^\d+$/.test(parts[0])) {
    return { raw: trimmed, kind: "major", version: trimmed };
  }

  if (parts.length === 2 && parts.every((p) => /^\d+$/.test(p))) {
    return { raw: trimmed, kind: "major_minor", version: trimmed };
  }

  return { raw: trimmed, kind: "exact", version: trimmed };
}

export function rewriteConstraint(
  constraint: VersionConstraint,
  latestVersion: string,
): string {
  switch (constraint.kind) {
    case "gte":
      return `>=${latestVersion}`;
    case "exact":
      return latestVersion;
    case "major_minor": {
      const parts = latestVersion.split(".");
      return `${parts[0]}.${parts[1]}`;
    }
    case "major": {
      const parts = latestVersion.split(".");
      return parts[0];
    }
    default:
      return constraint.raw;
  }
}
