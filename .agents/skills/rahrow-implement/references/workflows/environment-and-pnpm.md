# Environment And Pnpm

Pinned environment, pnpm, Turbo, RahRow dogfooding, and package scripts.

## Environment and Setup

Use the versions pinned by the repository:

- Node `24.16.0` from `.nvmrc`
- pnpm `11.5.2` from `packageManager`
- TypeScript and other tools from the lockfile

Initial setup:

```bash
pnpm install --frozen-lockfile
```

Do not replace pnpm with npm, Yarn, or Bun for workspace operations. Update
`.nvmrc`, `engines`, `packageManager`, and the lockfile together when changing
the supported toolchain.

## pnpm and Turbo

`pnpm-workspace.yaml` includes only active workspaces:

```text
apps/desktop
apps/mobile
apps/www
packages/core
packages/engine
packages/tooling
packages/ui
```

Current root commands:

```bash
pnpm dev
pnpm build
pnpm test
pnpm test:watch
pnpm lint
pnpm format
pnpm check
pnpm clean
```

Current behavior:

- `dev` runs `turbo dev`.
- `build` runs dependency builds first through Turbo.
- `test` uses Turbo to run package-local Vitest suites plus the root workspace
  architecture suite exposed as `test:architecture`.
- `test:watch` uses Turbo to start package-local Vitest watch tasks.
- `check` runs lint, tests, and the build in sequence.
- `lint` runs `biome check .` without writing fixes.
- `format` runs `biome format --write .`.
- `clean` runs the Turbo clean task.

`@rahrow/core`, `@rahrow/engine`, and `@rahrow/ui` currently define `build` and
`test`. Their builds run strict TypeScript checks, and their tests run owning
source tests through Vitest. Other active workspaces should be inspected before
assuming they define `build`, `test`, `typecheck`, or `dev`.

Use exact package names:

```bash
pnpm --filter @rahrow/core test
pnpm --filter @rahrow/engine test
pnpm --filter @rahrow/app-mobile dev
```

The repository validates RahRow through:

```bash
pnpm build
pnpm lint
pnpm test
pnpm --filter @rahrow/app-desktop dev:web
pnpm --filter @rahrow/app-mobile dev
pnpm --filter @rahrow/www dev
```

Package-local `test` and `test:watch` scripts are required because Turbo
orchestrates scripts declared by each workspace and filtered package commands
must remain available. Root-only architecture tests run once after Turbo rather
than being duplicated inside every package. There is no `transit` script;
Turbo's dependency traversal is orchestration, not another test suite.

There is no active repository-level RahRow runtime config file. Keep app and
package configuration with the owning workspace until a public config contract
is deliberately introduced.

If Turbo reports duplicate workspace names, fix the incorrect package manifest.
Do not work around the graph with directory filters or aliases.

`pnpm update-deps` performs broad recursive upgrades, deduplication, and audit
mutation. Run it only for an explicit dependency-update task and review the
lockfile and compatibility impact.
