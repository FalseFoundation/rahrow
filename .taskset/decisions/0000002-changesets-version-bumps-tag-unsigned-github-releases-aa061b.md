---
id: aa061b
type: decision
title: Changesets version bumps tag unsigned GitHub Releases
status: accepted
owner: junkieshuffle
createdAt: 2026-10-05 17:47 UTC
updatedAt: 2026-10-05 17:50 UTC
related:
  - 40b183
  - ea8d68
files:
  - .changeset/config.json
  - .github/workflows/version.yml
  - .github/workflows/release.yml
directories:
  - .github/workflows
  - .changeset
projects:
  - rahrow-release
---

# Changesets version bumps tag unsigned GitHub Releases

## Context

RahRow already uses Changesets for private package versioning and had a manual unsigned desktop Release workflow that stopped before publishing. Product distribution is application installers, not npm publish. Production signing stays blocked under ea8d68.

## Decision

Use the standard Changesets automation path:

1. `changesets/action` opens a Version Packages PR on `main`.
2. `pnpm version-packages` runs `changeset version` then syncs the product version into Tauri/Android/iOS manifests.
3. `@rahrow/desktop`, `@rahrow/mobile`, and `@rahrow/cli` share one product version through Changesets `fixed`.
4. After the Version Packages PR merges, `pnpm tag-release` creates `vX.Y.Z` only when the product version advanced.
5. Tag pushes run the Release workflow, which builds desktop installers, an Android debug APK, and an iOS Simulator preview, then publishes a prerelease GitHub Release with those assets.

## Alternatives

- Detect arbitrary `package.json` diffs: rejected; noisy and not Changesets-native.
- npm publish private packages: rejected; RahRow ships apps, not library registry artifacts.
- Production-signed releases now: rejected; blocked by ea8d68.

## Consequences

- Library-only version bumps do not create product tags.
- GitHub Releases stay labeled prerelease/unsigned until signing work lands.
- Mobile Android CI must build pinned native runtimes with local Go and NDK.
- iOS device IPA remains out of scope; Simulator preview is the unsigned iOS artifact.

## Migration

No migration. Existing pending changesets still version through the Version Packages PR.

## Status

Accepted.
