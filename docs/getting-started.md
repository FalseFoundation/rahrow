---
title: Getting Started
description: Set up the RahRow monorepo and run the core development checks.
---

# Getting Started

RahRow is a cross-platform V2Ray client platform monorepo. This guide covers
local setup for contributors working on apps, packages, runtimes, and shared
tooling.

## Requirements

- Node.js 24.16.0 or newer
- pnpm 11.2.2 or newer

## Install Dependencies

From the repository root:

```bash
pnpm install
```

## Validate The Workspace

Run the standard quality checks:

```bash
pnpm lint
pnpm test
pnpm build
```

Or run the combined pipeline:

```bash
pnpm check
```

## Repository Layout

```text
apps/       platform applications (dashboard, desktop, mobile, server, web, www)
packages/   shared TypeScript packages (protocol, routing, storage, telemetry, etc.)
crates/     Rust crates for networking and system-level components
runtimes/   runtime adapters (http, hysteria, mock, sing-box, socks, wireguard, xray)
docs/       product and maintainer documentation
```

## Start Development

Use Turbo-powered scripts from the workspace root:

```bash
pnpm dev
```

Run focused package commands as needed:

```bash
pnpm --filter @rahrow/web dev
pnpm --filter @rahrow/server build
pnpm --filter @rahrow/routing test
```

## Current Scope

RahRow is still under active architecture development. Some packages and
apps are scaffold-level placeholders and do not yet expose complete runtime
networking behavior.

## Next

- [Configuration](configuration.md)
- [CLI and scripts](cli-reference.md)
- [Runtime files](runtime-files.md)
