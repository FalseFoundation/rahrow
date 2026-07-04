---
title: CLI Reference
description: Workspace command reference for RahRow development.
---

# CLI Reference

RahRow currently exposes workspace development commands through `pnpm` and
Turbo.

The repository does not yet publish a stable end-user runtime control CLI for
the cross-platform V2Ray client. Until runtime orchestration APIs stabilize,
use the workspace scripts below.

## Root Scripts

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm format
pnpm check
pnpm clean
pnpm update-deps
```

## Script Semantics

- `pnpm dev`: runs Turbo development pipelines across workspace packages
- `pnpm build`: runs build tasks across the workspace
- `pnpm test`: runs test tasks across the workspace
- `pnpm lint`: runs Biome checks
- `pnpm format`: formats files with Biome
- `pnpm check`: lint, test, and build in sequence
- `pnpm clean`: cleans Turbo build artifacts
- `pnpm update-deps`: updates recursive dependencies and deduplicates lockfile

## Scoped Package Commands

Use `--filter` for package-scoped work:

```bash
pnpm --filter @rahrow/web dev
pnpm --filter @rahrow/server build
pnpm --filter @rahrow/routing test
```

## Rust Workspace Commands

From the `crates/` workspace root:

```bash
cargo build
cargo test
```

## Notes

- Command coverage is intentionally scaffold-first while product APIs evolve.
- As runtime control surfaces stabilize, this page will expand with user-facing
  CLI commands for profile management, runtime lifecycle control, diagnostics,
  and subscription workflows.

## Future CLI Scope

Planned CLI capabilities include:

- runtime profile management
- protocol and transport lifecycle control
- diagnostics and health checks
- subscription and provider workflows
