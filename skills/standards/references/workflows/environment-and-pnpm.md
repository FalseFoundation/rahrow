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

`pnpm-workspace.yaml` recursively includes `apps/**` and `packages/**`.

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

`@rahrow/contracts`, `@rahrow/utils`, `@rahrow/core`, and `@rahrow/cli`
currently define `build` and `test`. Their builds run strict TypeScript
compilation into disposable `dist/` output, and their tests run the owning
source tests through the root Vitest config. Other packages remain scaffolds,
so inspect each affected manifest before assuming it defines `build`, `test`,
`typecheck`, or `dev`.

Those four packages form the public npm runtime and are published recursively.
Keep their runtime dependency chain public and keep package tarballs restricted
to built output, runtime source used by workspace development conditions, and
package documentation. Exclude tests, local build caches, and tool configs.
Their builds clean `dist/` before TypeScript emits so renamed files cannot leak
into published tarballs.

Use exact package names:

```bash
pnpm --filter @rahrow/core test
pnpm --filter @rahrow/cli build
pnpm --filter @rahrow/mcp dev
```

The repository validates RahRow through:

```bash
pnpm build
pnpm lint
pnpm test
pnpm --filter @rahrow/web dev
pnpm --filter @rahrow/server build
pnpm --filter @rahrow/routing test
```

Package-local `test` and `test:watch` scripts are required because Turbo
orchestrates scripts declared by each workspace and filtered package commands
must remain available. Root-only architecture tests run once after Turbo rather
than being duplicated inside every package. There is no `transit` script;
Turbo's dependency traversal is orchestration, not another test suite.

`rahrow.config.ts` is loaded as trusted project code using Node's native
erasable TypeScript support. Keep it free of syntax that requires TypeScript
code generation.

If Turbo reports duplicate workspace names, fix the incorrect package manifest.
Do not work around the graph with directory filters or aliases.

`pnpm update-deps` performs broad recursive upgrades, deduplication, and audit
mutation. Run it only for an explicit dependency-update task and review the
lockfile and compatibility impact.
