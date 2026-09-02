# Contributing to RahRow

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). Contributions are licensed under the [MIT License](LICENSE).

## Setup

- Node.js 24.16 or newer
- pnpm 11 (see `packageManager` in the root `package.json`)
- Go 1.26.3 only when rebuilding the pinned mobile Xray/libbox artifacts

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm lint
```

`pnpm build` is the portable TypeScript/web build. Native artifacts use explicit
package-owned commands: `pnpm bundle:desktop`, `pnpm bundle:android`, and
`pnpm bundle:ios`. Mobile runtime inputs are built with
`pnpm native:build:android` or `pnpm native:build:apple`, then checked with
`pnpm native:verify`. Those scripts enforce the pinned local Go toolchain and
record source, recipe, toolchain, and checksum provenance. Go is never shipped
as an application dependency and the applications never download it.

## Where code belongs

- Domain, URL parse/serialize, subscriptions, connection lifecycle, settings: `packages/core`
- Xray process, config, runtime manifest, TCP probe: `packages/engine`
- Shared desktop/mobile product UI: `packages/features`
- CLI, Tauri, Capacitor, and native edges: `apps/*`

Do not put protocol or subscription logic in app shells. Do not add a backend. Do not add README files for every tiny directory. Keep existing app and package READMEs accurate.

Desktop and mobile product UI should stay identical. Shared screens go in `packages/features`. Platform chrome (tray, system bars, VPN permission sheets) may differ.

## Tests

Vitest is the test runner. Protocol, subscription, Xray config, connection state, and store parse tests belong next to the code they cover. Golden JSON lives in colocated `goldens/` directories.

Treat imported URLs, subscription bodies, and persisted JSON as untrusted input.

## Changesets and tasks

Use Changesets when a published package contract or user-visible behavior changes. Use Taskset (`.taskset/`) for work tracking. Do not mark the parent release epic done while signing is blocked. Signing stays with [TS-01M0R1RHK86AW8PKX5DG940EXS](.taskset/tasks/TS-01M0R1RHK86AW8PKX5DG940EXS.md).

Security reports follow [SECURITY.md](SECURITY.md). Do not file a public issue for a vulnerability.
