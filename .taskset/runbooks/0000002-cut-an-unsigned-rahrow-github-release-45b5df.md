---
id: 45b5df
type: runbook
title: Cut an unsigned RahRow GitHub Release
status: active
owner: junkieshuffle
createdAt: 2026-10-05 17:47 UTC
updatedAt: 2026-10-05 17:50 UTC
related:
  - 40b183
directories:
  - .github/workflows
projects:
  - rahrow-release
---

# Cut an unsigned RahRow GitHub Release

## Purpose

Ship an unsigned development GitHub Release when the product apps version bumps.

## Preconditions

- Changesets exist for user-visible work that should bump `@rahrow/desktop` / `@rahrow/mobile` / `@rahrow/cli`.
- `main` is green on CI.
- No production signing secrets are required for this path.

## Symptoms

- Version Packages PR did not open after merging changesets.
- Tag `vX.Y.Z` missing after Version Packages merge.
- Release workflow failed to attach desktop or mobile assets.

## Checks

1. Confirm pending files under `.changeset/` (not only `config.json`).
2. Confirm `.github/workflows/version.yml` ran on the latest `main` push.
3. Confirm desktop/mobile/cli versions match and native manifests were synced.
4. Inspect the Release workflow run for the `v*` tag.

## Actions

1. Land feature PRs that include Changesets affecting product apps.
2. Wait for or merge the `Version Packages` PR created by `changesets/action`.
3. Confirm `pnpm tag-release` created `vX.Y.Z` on that merge.
4. Wait for `.github/workflows/release.yml` to finish and publish the prerelease.
5. For a rebuild without a version bump, run workflow_dispatch on Release with the version input.

## Rollback

- Delete the GitHub Release and the `vX.Y.Z` tag if the assets are wrong.
- Fix scripts/workflows on `main`, then re-run workflow_dispatch or cut the next version.

## Escalation

- Signing/notarization/store credentials: ea8d68 and the parent release epic 24c0bd.
- Native Android Go/NDK build failures: mobile native runtime pins and hev tunnel build.

## Verification

- GitHub Release exists for `vX.Y.Z`, marked prerelease.
- Assets include desktop bundles plus Android `.apk` and iOS Simulator `.app.zip`.
- Release body states unsigned/development.
