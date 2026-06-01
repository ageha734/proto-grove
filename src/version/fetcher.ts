import type { ResolvedRepo } from "../resolver/mod.ts";
import type { Config } from "../config.ts";

export async function fetchLatestVersion(
  repo: ResolvedRepo,
  config: Config,
  token: string,
): Promise<string | null> {
  const { owner, repo: repoName } = repo;

  // Try releases/latest first
  let tag = await fetchLatestRelease(owner, repoName, token);

  // Fallback to tags
  if (!tag) {
    tag = await fetchLatestTag(owner, repoName, token);
  }

  if (!tag) return null;

  return stripTagPrefix(tag, config.resolve.tagStripPrefixes);
}

async function fetchLatestRelease(
  owner: string,
  repo: string,
  token: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.tag_name ?? null;
  } catch {
    return null;
  }
}

async function fetchLatestTag(
  owner: string,
  repo: string,
  token: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/tags?per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data[0]?.name ?? null;
  } catch {
    return null;
  }
}

function stripTagPrefix(tag: string, prefixes: string[]): string {
  let result = tag;
  for (const prefix of prefixes) {
    const regex = new RegExp(prefix);
    result = result.replace(regex, "");
  }
  return result;
}
