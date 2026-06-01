import type { ResolvedRepo } from "./mod.ts";

export async function resolveFromSearch(
  toolName: string,
  token: string,
): Promise<ResolvedRepo | null> {
  try {
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(toolName)}+in:name&sort=stars&per_page=1`,
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
    const item = data.items?.[0];
    if (!item) return null;

    return {
      owner: item.owner.login,
      repo: item.name,
    };
  } catch {
    return null;
  }
}
