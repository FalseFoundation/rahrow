---
id: 40b183
title: Automate unsigned GitHub Releases from Changesets version bumps
status: done
priority: high
owner: junkieshuffle
assignees:
  - junkieshuffle
createdAt: 2026-10-05 17:47 UTC
updatedAt: 2026-10-05 17:51 UTC
labels:
  - packaging
related:
  - ea8d68
  - 24c0bd
  - aa061b
  - 45b5df
files:
  - package.json
  - .changeset/config.json
  - scripts/sync-app-versions.mjs
  - scripts/tag-product-release.mjs
  - .github/workflows/version.yml
  - .github/workflows/release.yml
  - tests/product-release.test.ts
  - CONTRIBUTING.md
directories:
  - .github/workflows
  - scripts
  - .changeset
projects:
  - rahrow-release
---

## Outcome

Auto-create unsigned GitHub Releases when the fixed product-app version bumps through Changesets.

## Checklist

- [x] Fixed Changesets group for desktop, mobile, and CLI
- [x] Sync native version fields from the product version
- [x] Tag `vX.Y.Z` after Version Packages merges
- [x] Release workflow builds desktop, Android, and iOS preview artifacts
- [x] GitHub Release attaches artifacts and marks prerelease/unsigned
- [x] Decision and runbook linked

## Acceptance

- Merging a Version Packages PR that bumps the product apps creates tag `vX.Y.Z`
- Tag workflow publishes a prerelease GitHub Release with desktop + mobile artifacts
- Production signing remains blocked under ea8d68
- Repo script tests cover version sync and tag decisions

## Changeset

Not required — CI/workflow and private app versioning automation only; no published package contract change beyond existing Changesets private versioning.

## References

- Decision: `.taskset/decisions/0000002-changesets-version-bumps-tag-unsigned-github-releases-aa061b.md` (`aa061b`)
- Runbook: `.taskset/runbooks/0000002-cut-an-unsigned-rahrow-github-release-45b5df.md` (`45b5df`)
- Related: ea8d68, 24c0bd
