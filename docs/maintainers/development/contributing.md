---
title: Contributing
description: Repository setup, contribution workflow, and completion expectations.
---

# Contributing

RahRow is pre-alpha. Prioritize architecture quality, protocol correctness,
and platform stability over feature volume.

## Start Here

Read `AGENTS.md`, `skills/standards/SKILL.md`, the product vision, the
architecture overview, and the technology preferences before changing the
repository. Discuss package boundaries, protocol contracts, runtime integration,
and compatibility implications before implementation.

## Setup

```bash
pnpm install --frozen-lockfile
pnpm check
```

Use the Node and pnpm versions declared by `.nvmrc` and `packageManager`.

## Engineering Rules

- Keep shared domain behavior in packages with explicit ownership boundaries.
- Keep shared schemas and contracts versioned and backward-aware.
- Keep runtime adapters isolated from interface-layer presentation concerns.
- Use feature-based architecture in UI and interaction surfaces.
- Add dependencies to the package that imports them.
- Prefer test-first work for protocol logic, parsers, compatibility changes,
  lifecycle transitions, and bug fixes.

## Finish The Work

Before declaring work complete:

1. Run the narrowest relevant test, then the broader checks required by risk.
2. Update affected user docs, maintainer docs, tests, and
   `skills/standards/`.
3. Run `pnpm check` and `git diff --check`.
4. Report compatibility consequences, checks, and remaining limitations.

Add a Changeset only when release configuration is active and a versioned
contract changes.
