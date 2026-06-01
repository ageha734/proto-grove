import type { GitHubClient } from "./client.ts";
import { getDefaultBranch, getReleaseNotes, githubApi } from "./client.ts";
import type { UpdateInfo } from "../version/comparator.ts";
import type { Vulnerability } from "../security/osv.ts";
import type { Config } from "../config.ts";
import type { ResolvedRepo } from "../resolver/mod.ts";

export interface PrResult {
  number: number;
  url: string;
  created: boolean;
}

export async function createUpdatePr(
  client: GitHubClient,
  update: UpdateInfo,
  upstream: ResolvedRepo,
  vulnerabilities: Vulnerability[],
  config: Config,
  branchPrefix: string,
  automergeLabel: string,
): Promise<PrResult | null> {
  const branch = `${branchPrefix}/${update.tool}-${update.latestVersion}`;
  const defaultBranch = await getDefaultBranch(client);

  // Check existing PR
  const existingPr = await findExistingPr(client, branch);
  if (existingPr) {
    return { number: existingPr, url: "", created: false };
  }

  // Get release notes
  const releaseNotes = await getReleaseNotes(
    client,
    upstream.owner,
    upstream.repo,
    update.latestVersion,
  );

  // Build PR body
  const body = buildPrBody(update, upstream, releaseNotes, vulnerabilities);

  // Build labels
  const labels = buildLabels(update, vulnerabilities, config, automergeLabel);

  // Create branch via Git API (update file content)
  const fileUpdated = await updateFileOnBranch(
    client,
    defaultBranch,
    branch,
    update,
  );
  if (!fileUpdated) return null;

  // Create PR
  const title =
    `${config.general.prTitlePrefix} update ${update.tool} to ${update.latestVersion}`;

  const response = await githubApi(
    client,
    `/repos/${client.owner}/${client.repo}/pulls`,
    {
      method: "POST",
      body: JSON.stringify({
        title,
        body,
        head: branch,
        base: defaultBranch,
      }),
    },
  );

  if (!response.ok) return null;

  const prData = await response.json();

  // Add labels
  if (labels.length > 0) {
    await githubApi(
      client,
      `/repos/${client.owner}/${client.repo}/issues/${prData.number}/labels`,
      {
        method: "POST",
        body: JSON.stringify({ labels }),
      },
    );
  }

  return {
    number: prData.number,
    url: prData.html_url,
    created: true,
  };
}

async function findExistingPr(
  client: GitHubClient,
  branch: string,
): Promise<number | null> {
  const response = await githubApi(
    client,
    `/repos/${client.owner}/${client.repo}/pulls?head=${client.owner}:${branch}&state=open`,
  );

  if (!response.ok) return null;

  const prs = await response.json();
  return prs[0]?.number ?? null;
}

async function updateFileOnBranch(
  client: GitHubClient,
  baseBranch: string,
  newBranch: string,
  update: UpdateInfo,
): Promise<boolean> {
  // Get base branch SHA
  const refResponse = await githubApi(
    client,
    `/repos/${client.owner}/${client.repo}/git/refs/heads/${baseBranch}`,
  );
  if (!refResponse.ok) return false;
  const refData = await refResponse.json();
  const baseSha = refData.object.sha;

  // Create new branch
  const createRefResponse = await githubApi(
    client,
    `/repos/${client.owner}/${client.repo}/git/refs`,
    {
      method: "POST",
      body: JSON.stringify({
        ref: `refs/heads/${newBranch}`,
        sha: baseSha,
      }),
    },
  );

  // Branch might already exist, try to update it
  if (!createRefResponse.ok) {
    const updateRefResponse = await githubApi(
      client,
      `/repos/${client.owner}/${client.repo}/git/refs/heads/${newBranch}`,
      {
        method: "PATCH",
        body: JSON.stringify({ sha: baseSha, force: true }),
      },
    );
    if (!updateRefResponse.ok) return false;
  }

  // Get current file content
  const prototoolsPath = Deno.env.get("INPUT_PROTOTOOLS-PATH") ?? ".prototools";
  const fileResponse = await githubApi(
    client,
    `/repos/${client.owner}/${client.repo}/contents/${prototoolsPath}?ref=${newBranch}`,
  );
  if (!fileResponse.ok) return false;
  const fileData = await fileResponse.json();

  const currentContent = atob(fileData.content.replace(/\n/g, ""));
  const updatedContent = currentContent.replace(
    new RegExp(
      `^(${update.tool}\\s*=\\s*")${escapeRegex(update.constraint.raw)}"`,
      "m",
    ),
    `$1${update.newConstraintValue}"`,
  );

  if (currentContent === updatedContent) return false;

  // Update file
  const updateResponse = await githubApi(
    client,
    `/repos/${client.owner}/${client.repo}/contents/${prototoolsPath}`,
    {
      method: "PUT",
      body: JSON.stringify({
        message: `${
          Deno.env.get("INPUT_COMMIT-MESSAGE-PREFIX") ?? "chore(deps):"
        } update ${update.tool} to ${update.latestVersion}`,
        content: btoa(updatedContent),
        sha: fileData.sha,
        branch: newBranch,
      }),
    },
  );

  return updateResponse.ok;
}

function buildPrBody(
  update: UpdateInfo,
  upstream: ResolvedRepo,
  releaseNotes: string,
  vulnerabilities: Vulnerability[],
): string {
  const compareUrl =
    `https://github.com/${upstream.owner}/${upstream.repo}/compare/v${update.currentVersion}...v${update.latestVersion}`;

  let body =
    `## Update \`${update.tool}\` from \`${update.currentVersion}\` to \`${update.latestVersion}\`

| Package | Type | Update | Current | Latest |
|---------|------|--------|---------|--------|
| [${update.tool}](https://github.com/${upstream.owner}/${upstream.repo}) | proto-tool | ${update.updateType} | \`${update.currentVersion}\` | \`${update.latestVersion}\` |

### Release Notes

<details>
<summary>${upstream.owner}/${upstream.repo} (v${update.latestVersion})</summary>

${releaseNotes || "_No release notes available_"}

</details>

### Compare

[v${update.currentVersion} → v${update.latestVersion}](${compareUrl})`;

  if (vulnerabilities.length > 0) {
    body += `

### :rotating_light: Security Advisories (current version)

| CVE | Summary | Severity |
|-----|---------|----------|
${
      vulnerabilities.map((v) => `| ${v.id} | ${v.summary} | ${v.severity} |`)
        .join("\n")
    }

> Updating is strongly recommended.`;
  }

  body += `

---
_This PR was auto-generated by [proto-grove](https://github.com/ageha734/proto-grove)._`;

  return body;
}

function buildLabels(
  update: UpdateInfo,
  vulnerabilities: Vulnerability[],
  config: Config,
  automergeLabel: string,
): string[] {
  const labels = [...config.labels.base];

  const shouldAutomerge =
    (update.updateType === "patch" && config.automerge.patch) ||
    (update.updateType === "minor" && config.automerge.minor) ||
    (update.updateType === "major" && config.automerge.major);

  if (shouldAutomerge) {
    labels.push(automergeLabel);
  }

  if (update.updateType === "major") {
    labels.push(config.labels.major);
  }

  if (vulnerabilities.length > 0) {
    labels.push(config.labels.security);
    if (config.automerge.securityFix) {
      labels.push(automergeLabel);
    }
  }

  return [...new Set(labels)];
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
