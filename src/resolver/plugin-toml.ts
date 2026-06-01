import type { ResolvedRepo } from "./mod.ts";

export async function resolveFromPluginUrl(
  pluginUrl: string,
): Promise<ResolvedRepo | null> {
  // github://owner/repo format
  const githubMatch = pluginUrl.match(/^github:\/\/([^/]+)\/([^/]+)/);
  if (githubMatch) {
    const [, owner, repo] = githubMatch;
    if (isProtoPluginRepo(repo)) {
      return null;
    }
    return { owner, repo };
  }

  // raw.githubusercontent.com URL → fetch and parse [resolve].git-url
  if (pluginUrl.includes("raw.githubusercontent.com")) {
    try {
      const response = await fetch(pluginUrl);
      if (!response.ok) return null;

      const content = await response.text();
      return parseGitUrlFromPluginToml(content);
    } catch {
      return null;
    }
  }

  return null;
}

function parseGitUrlFromPluginToml(content: string): ResolvedRepo | null {
  // Look for git-url or github pattern in [resolve] section
  const gitUrlMatch = content.match(
    /git-url\s*=\s*"https:\/\/github\.com\/([^/]+)\/([^/"]+)/,
  );
  if (gitUrlMatch) {
    return { owner: gitUrlMatch[1], repo: gitUrlMatch[2] };
  }

  // Look for github-repo pattern
  const repoMatch = content.match(
    /github-repo\s*=\s*"([^/]+)\/([^"]+)"/,
  );
  if (repoMatch) {
    return { owner: repoMatch[1], repo: repoMatch[2] };
  }

  // Try to find any github.com reference in the file
  const genericGithub = content.match(
    /github\.com\/([^/]+)\/([^/"\s]+)/,
  );
  if (genericGithub) {
    const [, owner, repo] = genericGithub;
    if (!isProtoPluginRepo(repo)) {
      return { owner, repo: repo.replace(/\.git$/, "") };
    }
  }

  return null;
}

function isProtoPluginRepo(repo: string): boolean {
  return repo.startsWith("proto-") || repo === "proto-plugins";
}
