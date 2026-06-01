# proto-grove

[![CI](https://github.com/ageha734/proto-grove/actions/workflows/ci.yaml/badge.svg)](https://github.com/ageha734/proto-grove/actions/workflows/ci.yaml)
[![Release](https://github.com/ageha734/proto-grove/actions/workflows/release.yaml/badge.svg)](https://github.com/ageha734/proto-grove/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Automated version management for [moonrepo proto](https://moonrepo.dev/proto) tools. A purpose-built Renovate/Dependabot alternative for `.prototools`.

## Features

- **Auto-detect tools** — Parses `.prototools` dynamically. Add a tool, it's automatically tracked.
- **Smart repo resolution** — Resolves upstream GitHub repos from plugin TOML metadata, configurable overrides, or search fallback.
- **Renovate-style PRs** — Individual PRs per tool with release notes, compare URLs, and changelog.
- **CVE scanning** — Checks current versions against OSV.dev for known vulnerabilities.
- **Dependency Dashboard** — A single issue tracking all dependencies.
- **Automerge support** — Labels minor/patch PRs for automerge; major updates require review.
- **Configurable** — `.github/proto-grove.toml` for repo overrides, ignore lists, automerge policy.

## Quick Start

```yaml
name: "Proto Tools Update"

on:
  schedule:
    - cron: "0 9 * * 1"
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: ageha734/proto-grove@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `prototools-path` | Path to `.prototools` file | `.prototools` |
| `config-path` | Path to config file | `.github/proto-grove.toml` |
| `github-token` | GitHub token for API access | `${{ github.token }}` |
| `branch-prefix` | Branch prefix for PRs | `deps/proto` |
| `automerge-label` | Label for auto-mergeable PRs | `automerge` |
| `labels` | Comma-separated base labels | `dependencies` |
| `security-labels` | Labels for security PRs | `security` |
| `dashboard` | Enable dashboard issue | `true` |
| `dry-run` | Audit only, no PRs | `false` |
| `log-level` | Verbosity (debug/info/warn/error) | `info` |

## Outputs

| Output | Description |
|--------|-------------|
| `outdated-count` | Number of outdated tools |
| `prs-created` | Number of PRs created |
| `cves-found` | Number of CVEs found |
| `summary` | Markdown audit summary |

## Configuration

Create `.github/proto-grove.toml` in your repository:

```toml
[general]
create-dashboard = true
commit-message-prefix = "chore(deps):"

[automerge]
patch = true
minor = true
major = false
security-fix = true

[labels]
base = ["dependencies"]
automerge = "automerge"
security = "security"

# Repository overrides (when auto-detection fails)
[repos]
go = "golang/go"
argocd = "argoproj/argo-cd"
kubectl = "kubernetes/kubernetes"
shfmt = "mvdan/sh"

# Tools to skip
[ignore]
tools = ["npm", "gcloud", "sdkman"]

[security]
enabled = true
ecosystems = ["Go", "PyPI", "npm", "crates.io", "RubyGems"]
```

## How It Works

1. **Parse** — Reads `.prototools` and extracts tools with their version constraints
2. **Resolve** — Determines the upstream GitHub repository for each tool:
   - User-defined overrides (config)
   - Plugin TOML `[resolve].git-url` field (fetched from plugin URL)
   - GitHub search API (fallback)
3. **Compare** — Fetches latest releases and compares with current versions
4. **Scan** — Checks OSV.dev for CVEs affecting current versions
5. **Update** — Creates individual PRs with Renovate-style descriptions
6. **Dashboard** — Maintains a Dependency Dashboard issue

## Version Constraint Support

| Format | Example | Behavior |
|--------|---------|----------|
| `>=x.y.z` | `>=1.7.7` | Updates floor to latest |
| `x.y.z` | `1.7.7` | Pins to new exact version |
| `x.y` | `1.25` | Updates within major.minor track |
| `x` | `22` | Updates within major track |
| `stable` | `stable` | Skipped |
| `""` | `""` | Skipped |

## Documentation

Full documentation is available at [https://ageha734.github.io/proto-grove/](https://ageha734.github.io/proto-grove/)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
