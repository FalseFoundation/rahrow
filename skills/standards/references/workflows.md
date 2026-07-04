# Workflows

Use this file as the routing map for repository workflows. Load only the topic
file needed for the change, then load additional files when the work crosses
that boundary.

## Routing

- [environment-and-pnpm.md](workflows/environment-and-pnpm.md): pinned Node and
  pnpm versions, root commands, Turbo behavior, package scripts, RahRow
  dogfooding, and dependency update caveats
- [dependencies-and-docs-site.md](workflows/dependencies-and-docs-site.md):
  dependency installation rules, docs website workflow, GitHub Pages static
  export, and backend dependency preferences
- [validation.md](workflows/validation.md): validation command order, root
  checks, formatting, and handling unrelated scaffold failures
- [vitest-and-test-strategy.md](workflows/vitest-and-test-strategy.md): Vitest
  workflow, TDD guidance, and RahRow test coverage strategy
- [persisted-data-and-git.md](workflows/persisted-data-and-git.md): persisted
  data, generated view, Git fixture, compatibility, and concurrency workflows

## Loading Guidance

- For setup, root commands, package scripts, Turbo behavior, or RahRow
  dogfooding, load `environment-and-pnpm.md`.
- For adding dependencies, website/docs builds, static export, or backend
  dependency choices, load `dependencies-and-docs-site.md`.
- For any implementation or documentation change that needs verification, load
  `validation.md`.
- For tests, bug fixes, parser behavior, CLI behavior, or domain changes, load
  `vitest-and-test-strategy.md`.
- For persisted format changes, generated views, snapshots, Git fixture tests,
  or concurrency-sensitive writes, load `persisted-data-and-git.md`.
