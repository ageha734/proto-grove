import { parsePrototools } from "./parser/prototools.ts";
import { rewriteConstraint } from "./parser/constraint.ts";
import { resolveRepo } from "./resolver/mod.ts";
import { fetchLatestVersion } from "./version/fetcher.ts";
import { detectUpdateType, isOutdated } from "./version/comparator.ts";
import { checkVulnerabilities } from "./security/osv.ts";
import { createClient } from "./github/client.ts";
import { createUpdatePr } from "./github/pr.ts";
import { updateDashboardIssue } from "./github/issue.ts";
import { defaultConfig, loadConfig } from "./config.ts";
import type { UpdateInfo } from "./version/comparator.ts";
import type { Vulnerability } from "./security/osv.ts";

interface RunResult {
  outdatedCount: number;
  prsCreated: number;
  cvesFound: number;
  summary: string;
}

async function run(): Promise<RunResult> {
  const token = Deno.env.get("INPUT_GITHUB-TOKEN") ?? "";
  const prototoolsPath = Deno.env.get("INPUT_PROTOTOOLS-PATH") ?? ".prototools";
  const configPath = Deno.env.get("INPUT_CONFIG-PATH") ??
    ".github/proto-grove.toml";
  const branchPrefix = Deno.env.get("INPUT_BRANCH-PREFIX") ?? "deps/proto";
  const automergeLabel = Deno.env.get("INPUT_AUTOMERGE-LABEL") ?? "automerge";
  const dashboardEnabled = Deno.env.get("INPUT_DASHBOARD") !== "false";
  const dryRun = Deno.env.get("INPUT_DRY-RUN") === "true";
  const logLevel = Deno.env.get("INPUT_LOG-LEVEL") ?? "info";

  const [repoOwner, repoName] = (
    Deno.env.get("GITHUB_REPOSITORY") ?? "owner/repo"
  ).split("/");

  const log = createLogger(logLevel);

  // Load config
  let config = defaultConfig();
  try {
    const configContent = await Deno.readTextFile(configPath);
    config = loadConfig(configContent);
    log.info(`Loaded config from ${configPath}`);
  } catch {
    log.info("No config file found, using defaults");
  }

  // Parse prototools
  const prototoolsContent = await Deno.readTextFile(prototoolsPath);
  const prototools = parsePrototools(prototoolsContent);
  log.info(`Found ${prototools.tools.length} tools in ${prototoolsPath}`);

  const client = createClient(token, repoOwner, repoName);

  const updates: UpdateInfo[] = [];
  const upToDate: Array<{ tool: string; version: string; repo: string }> = [];
  const skipped: Array<{ tool: string; reason: string }> = [];
  const allCves: Array<
    { tool: string; version: string; vulns: Vulnerability[] }
  > = [];
  const dashboardUpdates: Array<{
    tool: string;
    current: string;
    latest: string;
    updateType: string;
    prNumber?: number;
  }> = [];

  let prsCreated = 0;

  for (const tool of prototools.tools) {
    // Skip tools with no version or in ignore list
    if (
      tool.constraint.kind === "empty" ||
      tool.constraint.kind === "stable" ||
      config.ignore.tools.includes(tool.name)
    ) {
      skipped.push({
        tool: tool.name,
        reason: tool.constraint.kind === "empty"
          ? "No version specified"
          : tool.constraint.kind === "stable"
          ? 'Constraint is "stable"'
          : "In ignore list",
      });
      continue;
    }

    // Check ignore patterns
    if (config.ignore.patterns.some((p) => matchPattern(tool.name, p))) {
      skipped.push({ tool: tool.name, reason: "Matches ignore pattern" });
      continue;
    }

    log.debug(`Processing ${tool.name}...`);

    // Resolve repo
    const repo = await resolveRepo(tool, config, token);
    if (!repo) {
      skipped.push({ tool: tool.name, reason: "Could not resolve repository" });
      continue;
    }

    // Fetch latest version
    const latest = await fetchLatestVersion(repo, config, token);
    if (!latest) {
      skipped.push({
        tool: tool.name,
        reason: "Could not fetch latest version",
      });
      continue;
    }

    const current = tool.constraint.version!;

    // Check if outdated
    if (isOutdated(current, latest)) {
      const updateType = detectUpdateType(current, latest);
      const newConstraint = rewriteConstraint(tool.constraint, latest);

      const update: UpdateInfo = {
        tool: tool.name,
        currentVersion: current,
        latestVersion: latest,
        updateType,
        constraint: tool.constraint,
        newConstraintValue: newConstraint,
      };

      updates.push(update);

      // CVE check
      let vulns: Vulnerability[] = [];
      if (config.security.enabled) {
        vulns = await checkVulnerabilities(
          tool.name,
          current,
          config.security.ecosystems,
        );
        if (vulns.length > 0) {
          allCves.push({ tool: tool.name, version: current, vulns });
        }
      }

      // Create PR (unless dry-run)
      let prNumber: number | undefined;
      if (!dryRun) {
        const result = await createUpdatePr(
          client,
          update,
          repo,
          vulns,
          config,
          branchPrefix,
          automergeLabel,
        );
        if (result?.created) {
          prsCreated++;
          prNumber = result.number;
          log.info(
            `Created PR #${result.number} for ${tool.name}: ${current} → ${latest}`,
          );
        } else if (result) {
          log.info(`PR already exists for ${tool.name} (${latest})`);
          prNumber = result.number;
        }
      } else {
        log.info(
          `[dry-run] Would create PR: ${tool.name} ${current} → ${latest} (${updateType})`,
        );
      }

      dashboardUpdates.push({
        tool: tool.name,
        current,
        latest,
        updateType,
        prNumber,
      });
    } else {
      upToDate.push({
        tool: tool.name,
        version: current,
        repo: `${repo.owner}/${repo.repo}`,
      });

      // CVE check for up-to-date tools too
      if (config.security.enabled) {
        const vulns = await checkVulnerabilities(
          tool.name,
          current,
          config.security.ecosystems,
        );
        if (vulns.length > 0) {
          allCves.push({ tool: tool.name, version: current, vulns });
        }
      }
    }

    // Rate limiting
    await delay(config.rateLimit.delayMs);
  }

  // Update dashboard issue
  if (dashboardEnabled && !dryRun) {
    await updateDashboardIssue(
      client,
      dashboardUpdates,
      upToDate,
      skipped,
      allCves,
    );
    log.info("Updated Dependency Dashboard issue");
  }

  // Build summary
  const summary = buildSummary(updates, upToDate, skipped, allCves, prsCreated);

  // Set GitHub Actions outputs
  setOutput("outdated-count", updates.length.toString());
  setOutput("prs-created", prsCreated.toString());
  setOutput("cves-found", allCves.length.toString());
  setOutput("summary", summary);

  // Write to GITHUB_STEP_SUMMARY
  const summaryFile = Deno.env.get("GITHUB_STEP_SUMMARY");
  if (summaryFile) {
    await Deno.writeTextFile(summaryFile, summary, { append: true });
  }

  console.log(summary);

  return {
    outdatedCount: updates.length,
    prsCreated,
    cvesFound: allCves.length,
    summary,
  };
}

function buildSummary(
  updates: UpdateInfo[],
  upToDate: Array<{ tool: string; version: string; repo: string }>,
  skipped: Array<{ tool: string; reason: string }>,
  cves: Array<{ tool: string; version: string; vulns: Vulnerability[] }>,
  prsCreated: number,
): string {
  let summary = "# proto-grove Audit Summary\n\n";

  summary += `| Metric | Count |\n|--------|-------|\n`;
  summary += `| Outdated | ${updates.length} |\n`;
  summary += `| Up-to-date | ${upToDate.length} |\n`;
  summary += `| Skipped | ${skipped.length} |\n`;
  summary += `| CVEs found | ${
    cves.reduce((acc, c) => acc + c.vulns.length, 0)
  } |\n`;
  summary += `| PRs created | ${prsCreated} |\n\n`;

  if (updates.length > 0) {
    summary += "## Updates\n\n";
    summary +=
      "| Tool | Current | Latest | Type |\n|------|---------|--------|------|\n";
    for (const u of updates) {
      summary +=
        `| ${u.tool} | ${u.currentVersion} | ${u.latestVersion} | ${u.updateType} |\n`;
    }
    summary += "\n";
  }

  return summary;
}

function setOutput(name: string, value: string): void {
  const outputFile = Deno.env.get("GITHUB_OUTPUT");
  if (outputFile) {
    Deno.writeTextFileSync(outputFile, `${name}=${value}\n`, { append: true });
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function matchPattern(name: string, pattern: string): boolean {
  const regex = new RegExp(
    "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
  );
  return regex.test(name);
}

function createLogger(level: string) {
  const levels = ["debug", "info", "warn", "error"];
  const minLevel = levels.indexOf(level);

  return {
    debug: (msg: string) => {
      if (minLevel <= 0) console.log(`::debug::${msg}`);
    },
    info: (msg: string) => {
      if (minLevel <= 1) console.log(msg);
    },
    warn: (msg: string) => {
      if (minLevel <= 2) console.log(`::warning::${msg}`);
    },
    error: (msg: string) => {
      if (minLevel <= 3) console.log(`::error::${msg}`);
    },
  };
}

// Run
run().catch((err) => {
  console.error(`::error::${err.message}`);
  Deno.exit(1);
});
