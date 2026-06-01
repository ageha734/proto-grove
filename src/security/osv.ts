export interface Vulnerability {
  id: string;
  summary: string;
  severity: string;
  fixedIn: string[];
}

export async function checkVulnerabilities(
  toolName: string,
  version: string,
  ecosystems: string[],
): Promise<Vulnerability[]> {
  for (const ecosystem of ecosystems) {
    const vulns = await queryOsv(toolName, version, ecosystem);
    if (vulns.length > 0) return vulns;
  }
  return [];
}

async function queryOsv(
  packageName: string,
  version: string,
  ecosystem: string,
): Promise<Vulnerability[]> {
  try {
    const response = await fetch("https://api.osv.dev/v1/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        package: { name: packageName, ecosystem },
        version,
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const vulns = data.vulns ?? [];

    return vulns.slice(0, 10).map(
      (v: Record<string, unknown>): Vulnerability => ({
        id: (v.id as string) ?? "unknown",
        summary: ((v.summary as string) ?? "No summary").slice(0, 200),
        severity: extractSeverity(v),
        fixedIn: extractFixedVersions(v),
      }),
    );
  } catch {
    return [];
  }
}

function extractSeverity(vuln: Record<string, unknown>): string {
  const severity = vuln.severity as Array<Record<string, string>> | undefined;
  if (!severity || severity.length === 0) return "unknown";
  return severity[0]?.score ?? "unknown";
}

function extractFixedVersions(vuln: Record<string, unknown>): string[] {
  const affected = vuln.affected as Array<Record<string, unknown>> | undefined;
  if (!affected) return [];

  const versions: string[] = [];
  for (const a of affected) {
    const ranges = a.ranges as Array<Record<string, unknown>> | undefined;
    if (!ranges) continue;
    for (const range of ranges) {
      const events = range.events as Array<Record<string, string>> | undefined;
      if (!events) continue;
      for (const event of events) {
        if (event.fixed) versions.push(event.fixed);
      }
    }
  }
  return versions;
}
