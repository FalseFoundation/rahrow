---
id: d1cc4f
type: decision
title: Pin official engine releases and schedule source tasks with transit nodes
status: accepted
owner: junkieshuffle
createdAt: 2026-10-05 09:45 UTC
updatedAt: 2026-10-05 09:45 UTC
labels:
  - tooling
  - build
related:
  - 5fcd40
files:
  - turbo.json
  - package.json
  - scripts/update-engine-releases.mjs
directories:
  - engines
---

## Decision

`pnpm update-deps` updates npm dependencies and the official Xray and sing-box releases together. Workspace packages that export TypeScript source use a Turbo `transit` task for `build`, `typecheck`, and `test`.

## Rationale

Xray and sing-box pins live in `engines/*/runtime.json` and the mobile source lock. Updating only npm packages left desktop binaries and mobile source revisions behind upstream releases. Package scripts import workspace TypeScript source, so `^build`, `^typecheck`, and `^test` waited on outputs nobody consumed.

## Consequences

- `update-engines` rewrites both runtime manifests from the newest GitHub releases, including a newer pre-release, and moves the matching mobile source pins to those tags. It leaves the HEV tunnel provider unchanged.
- `update-deps` runs the npm commands in order: `deps:up`, `deps:dedupe`, `deps:audit`, then `update-engines`. Those stay direct pnpm and node commands.
- Desktop `bundle` depends on the web build and engine-config validation. Validation depends on sidecar staging. Tauri no longer repeats that chain in `beforeBuildCommand`.
- Mobile Android and iOS bundle scripts stay self-contained, so Turbo does not build the web app a second time.
- `cleanup` runs package `cleanup` scripts through Turbo, then `pnpm clean --lockfile`. `lint`, `format`, and `check` stay Biome commands so flags such as `--fix` pass through.

## References

- https://turborepo.dev/docs/crafting-your-repository/configuring-tasks
- https://github.com/XTLS/Xray-core/releases
- https://github.com/SagerNet/sing-box/releases
