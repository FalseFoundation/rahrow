---
id: 5fcd40
title: Update engines from official releases and schedule scripts with Turbo
status: done
owner: junkieshuffle
assignees:
  - junkieshuffle
createdAt: 2026-10-05 09:37 UTC
updatedAt: 2026-10-05 09:46 UTC
labels:
  - tooling
  - build
related:
  - d1cc4f
  - 4a17f7
  - f48496
files:
  - package.json
  - turbo.json
directories:
  - engines
  - scripts
  - apps/desktop
  - apps/mobile
---

## Outcome

`pnpm update-deps` updates npm dependencies and pins Xray and sing-box to their latest official GitHub releases. App and package tasks use Turbo `dependsOn`. Repo-wide Biome and root pnpm commands stay direct.

## In scope

- [x] Add an engine-release updater that rewrites `engines/*/runtime.json` checksums and the matching mobile source pins.
- [x] Wire that updater into `update-deps` so it runs alongside the npm update chain.
- [x] Replace root `&&` chains and the desktop Tauri `beforeBuildCommand` chain with Turbo task dependencies.
- [x] Use transit nodes for source-consumed `build`, `typecheck`, and `test` tasks.
- [x] Register native pin verification and desktop engine staging tasks. Repo-wide Biome and root pnpm commands stay outside Turbo.

## Acceptance criteria

- `pnpm update-deps` runs `deps:up`, `deps:dedupe`, `deps:audit`, then `update-engines` as direct commands.
- Desktop `bundle` waits for `build` and engine config validation, and validation waits for sidecar staging. `beforeBuildCommand` no longer repeats that chain.
- `build`, `typecheck`, and `test` depend on `transit` rather than `^build`, `^typecheck`, or `^test`.
- Engine updater tests cover release mapping without a network call.

## Changeset

Not required. The change is repository tooling and pinned engine metadata, and every workspace package is private application code rather than a published contract.

## Documents

- Decision: `.taskset/decisions/0000001-pin-official-engine-releases-and-schedule-source-tasks-with-transit-node-d1cc4f.md`
- Runbook: `.taskset/runbooks/0000001-update-dependencies-and-official-engine-releases-4a17f7.md`
- Lesson: `.taskset/lessons/0000001-source-exports-use-transit-tasks-instead-of-caret-dependencies-f48496.md`

## References

- `.agents/skills/rahrow-implement` and `.claude/skills/turborepo`
- Installed Turbo docs: `node_modules/turbo/docs`
- https://turborepo.dev/docs
- Official releases: https://github.com/XTLS/Xray-core/releases and https://github.com/SagerNet/sing-box/releases
- Mobile source pins follow the same versions: https://github.com/XTLS/libXray and https://github.com/SagerNet/sing-box
