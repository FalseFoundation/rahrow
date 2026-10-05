---
id: 4a17f7
type: runbook
title: Update dependencies and official engine releases
status: active
owner: junkieshuffle
createdAt: 2026-10-05 09:45 UTC
updatedAt: 2026-10-05 09:45 UTC
labels:
  - tooling
related:
  - 5fcd40
  - d1cc4f
files:
  - scripts/update-engine-releases.mjs
  - package.json
---

## When to use

Run this when npm dependencies or the pinned Xray and sing-box releases should move to their current official versions.

## Steps

1. From the repository root, run `pnpm update-deps`.
2. The command runs `deps:up`, then `deps:dedupe`, then `deps:audit`, then `update-engines`.
3. To refresh engines without touching npm packages, run `pnpm update-engines`.
4. Review the diff in `engines/xray/runtime.json`, `engines/sing-box/runtime.json`, `apps/mobile/native-runtime-pins.json`, and `pnpm-lock.yaml`.
5. Run `pnpm test` and `pnpm check`. `pnpm check --fix` forwards `--fix` to Biome. Typecheck is `pnpm typecheck`.

Optional: set `GITHUB_TOKEN` or `GH_TOKEN` before the command so GitHub API requests are authenticated.

## What the engine updater changes

- Desktop and CLI binary pins: version, archive name, executable path, download URL, and SHA-256 checksum for each committed platform.
- Mobile source pins for Xray (`XTLS/libXray`) and sing-box (`SagerNet/sing-box`): version, `v` tag, and the tag's commit SHA.
- Checksums come from the GitHub asset `sha256` digest. If a needed asset has no digest, the updater downloads that asset and hashes it.

## Failure and recovery

- A missing official archive or a missing native tag fails the command before it writes pins. Pre-releases stay in the candidate set, and the newest version wins.
- The HEV tunnel provider, Go toolchain, and Android NDK pins are not part of this command. Change those in `apps/mobile/native-runtime-pins.json` on purpose.
- If the lockfile or manifests are half-written by an interrupted npm update, restore them from Git and run `pnpm install`.
- `pnpm audit --fix update` exits 1 while a vulnerability remains, so later steps in `update-deps` do not run. Transitive pins that an update cannot move are forced in `pnpm-workspace.yaml` `overrides`. `braces` has no published fixed release; the nesting guard lives in `patches/braces@3.0.3.patch`, and `auditConfig.ignoreGhsas` lists GHSA-vfj7-8cjw-p6xm so the audit matches that patch.

## References

- https://github.com/XTLS/Xray-core/releases
- https://github.com/SagerNet/sing-box/releases
- https://github.com/XTLS/libXray
