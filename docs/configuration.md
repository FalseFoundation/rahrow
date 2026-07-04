---
title: Configuration
description: Repository and runtime configuration surfaces used by the RahRow monorepo.
---

# Configuration

RahRow is configured through workspace-level tooling files plus per-app and
per-runtime package configuration.

## Workspace Configuration

Core workspace files at the repository root:

- `package.json`: shared scripts and root dev dependencies
- `pnpm-workspace.yaml`: workspace package discovery
- `turbo.json`: build/test/dev pipeline orchestration
- `tsconfig.json`: TypeScript baseline settings
- `biome.json`: linting and formatting rules
- `vitest.config.ts`: test runner defaults

## App And Package Configuration

Each application and package owns its own manifest and build/runtime settings.
Examples include:

- `apps/*/package.json`
- `packages/*/package.json`
- `crates/*/Cargo.toml`
- `runtimes/*/` adapter-specific manifests and source

Internal dependency links should use `workspace:*` for local packages.

## Runtime Direction

RahRow targets a cross-platform V2Ray client architecture with modular
runtime adapters. Runtime configuration is expected to evolve around:

- protocol selection and transport profiles
- per-platform networking capabilities
- diagnostics and observability controls
- secure profile import/export workflows

As these surfaces stabilize, this document will link to concrete schema and
runtime configuration references.
