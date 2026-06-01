export interface GitHubClient {
  token: string;
  owner: string;
  repo: string;
}

export function createClient(
  token: string,
  owner: string,
  repo: string,
): GitHubClient {
  return { token, owner, repo };
}

export async function githubApi(
  client: GitHubClient,
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = endpoint.startsWith("https://")
    ? endpoint
    : `https://api.github.com${endpoint}`;

  return await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${client.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export async function getDefaultBranch(client: GitHubClient): Promise<string> {
  const response = await githubApi(
    client,
    `/repos/${client.owner}/${client.repo}`,
  );
  const data = await response.json();
  return data.default_branch ?? "main";
}

export async function getReleaseNotes(
  client: GitHubClient,
  repoOwner: string,
  repoName: string,
  version: string,
): Promise<string> {
  const tags = [`v${version}`, version];

  for (const tag of tags) {
    const response = await githubApi(
      client,
      `https://api.github.com/repos/${repoOwner}/${repoName}/releases/tags/${tag}`,
    );
    if (response.ok) {
      const data = await response.json();
      const body = data.body ?? "";
      return body.length > 2000 ? body.slice(0, 2000) + "\n..." : body;
    }
  }

  return "";
}
