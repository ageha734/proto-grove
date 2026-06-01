# Contributing to proto-grove

## Development Setup

### Prerequisites

- [Deno](https://deno.com/) >= 2.3
- [Docker](https://www.docker.com/) (for action testing)

### Getting Started

```bash
git clone https://github.com/ageha734/proto-grove.git
cd proto-grove
deno task test
```

### Commands

```bash
deno task test    # Run tests
deno task lint    # Lint code
deno task fmt     # Format code
deno task check   # Type check
```

## Project Structure

```
src/
├── main.ts              # Entry point and orchestration
├── config.ts            # Configuration loading
├── parser/              # .prototools TOML parsing
├── resolver/            # GitHub repository resolution
├── version/             # Version fetching and comparison
├── security/            # CVE scanning (OSV.dev)
└── github/              # PR creation and dashboard management
tests/
├── parser/              # Parser unit tests
├── version/             # Comparator unit tests
└── fixtures/            # Test fixtures
```

## Workflow

1. Fork the repository
2. Create a feature branch (`feat/my-feature`)
3. Write tests for new functionality
4. Ensure all tests pass (`deno task test`)
5. Ensure code is formatted (`deno task fmt`)
6. Submit a pull request

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `refactor:` — Code refactoring
- `test:` — Tests
- `chore:` — Maintenance

## Releases

Releases are automated via GitHub Actions on tag push. To release:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Code of Conduct

Be respectful and constructive.
