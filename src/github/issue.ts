import type { GitHubClient } from "./client.ts";
import { githubApi } from "./client.ts";
import type { UpdateInfo } from "../version/comparator.ts";
import type { Vulnerability } from "../security/osv.ts";
import type { ToolEntry } from "../parser/prototools.ts";

interface DashboardEntry {
  tool: string;
  current: string;
  latest: string;
  updateType: string;
  prNumber?: number;
}

export async function updateDashboardIssue(
  client: GitHubClient,
  updates: DashboardEntry[],
  upToDate: Array<{ tool: string; version: string; repo: string }>,
  skipped: Array<{ tool: string; reason: string }>,
  cves: Array<{ tool: string; version: string; vulns: Vulnerability[] }>,
): Promise<void> {
  const title = "Dependency Dashboard";
  const body = buildDashboardBody(updates, upToDate, skipped, cves);

  const existing = await findDashboardIssue(client, title);

  if (existing) {
    await githubApi(
      client,
      `/repos/${client.owner}/${client.repo}/issues/${existing}`,
      {
        method: "PATCH",
        body: JSON.stringify({ body }),
      },
    );
  } else {
    await githubApi(
      client,
      `/repos/${client.owner}/${client.repo}/issues`,
      {
        method: "POST",
        body: JSON.stringify({
          title,
          body,
          labels: ["dependencies"],
        }),
      },
    );
  }
}

async function findDashboardIssue(
  client: GitHubClient,
  title: string,
): Promise<number | null> {
  const response = await githubApi(
    client,
    `/repos/${client.owner}/${client.repo}/issues?state=open&labels=dependencies&per_page=100`,
  );

  if (!response.ok) return null;

  const issues = await response.json();
  const dashboard = issues.find(
    (i: Record<string, unknown>) => i.title === title,
  );
  return dashboard?.number ?? null;
}

function buildDashboardBody(
  updates: DashboardEntry[],
  upToDate: Array<{ tool: string; version: string; repo: string }>,
  skipped: Array<{ tool: string; reason: string }>,
  cves: Array<{ tool: string; version: string; vulns: Vulnerability[] }>,
): string {
  let body = `# Dependency Dashboard

This issue tracks all proto tool dependencies managed by proto-grove.

`;

  if (updates.length > 0) {
    body += `## Pending Updates

| Tool | Current | Latest | Type | PR |
|------|---------|--------|------|-----|
`;
    for (const u of updates) {
      const prLink = u.prNumber ? `#${u.prNumber}` : "-";
      body += `| ${u.tool} | ${u.current} | ${u.latest} | ${u.updateType} | ${prLink} |\n`;
    }
    body += "\n";
  }

  if (upToDate.length > 0) {
    body += `## Up-to-date

| Tool | Version | Repository |
|------|---------|------------|
`;
    for (const t of upToDate) {
      body += `| ${t.tool} | ${t.version} | ${t.repo} |\n`;
    }
    body += "\n";
  }

  if (skipped.length > 0) {
    body += `## Skipped

| Tool | Reason |
|------|--------|
`;
    for (const s of skipped) {
      body += `| ${s.tool} | ${s.reason} |\n`;
    }
    body += "\n";
  }

  if (cves.length > 0) {
    body += `## Security Alerts

| Tool | Version | CVE | Severity |
|------|---------|-----|----------|
`;
    for (const c of cves) {
      for (const v of c.vulns) {
        body += `| ${c.tool} | ${c.version} | ${v.id} | ${v.severity} |\n`;
      }
    }
    body += "\n";
  }

  body += `---
_Last updated: ${new Date().toISOString()}_
_Managed by [proto-grove](https://github.com/ageha734/proto-grove)_`;

  return body;
}

export type { DashboardEntry, ToolEntry, UpdateInfo };
