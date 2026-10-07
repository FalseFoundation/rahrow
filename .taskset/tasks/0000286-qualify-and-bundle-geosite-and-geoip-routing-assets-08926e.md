---
id: 08926e
title: Qualify and bundle GeoSite and GeoIP routing assets
status: todo
priority: high
owner: junkieshuffle
risk: high
createdAt: 2026-10-07 08:31 UTC
updatedAt: 2026-10-07 08:31 UTC
labels:
  - routing
  - licensing
  - security
related:
  - 7a283a
  - 91489e
parent: 8c9114
directories:
  - engines
  - packages/core
  - packages/engine
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-engine
  - rahrow-release
  - rahrow-phase-05-integration-and-hardening
---

## Outcome

Ship a provenance-aware, offline-capable GeoSite/GeoIP asset set for portable routing without making SagerNet data formats part of the RahRow domain.

## Scope

- Select the minimum SagerNet GeoSite and GeoIP rule sets required by RahRow presets.
- Define RahRow-owned asset metadata for source, upstream version, SHA-256, installed time, compatibility, and rollback state.
- Bundle a verified baseline in each advertised artifact; optional data-only updates are bounded, checksummed, atomic, cancelable where safe, and retain the last valid version.
- Keep sing-box SRS files behind the sing-box adapter and provide equivalent Xray inputs or deterministic conversion output.
- Record licenses, upstream provenance, modification/conversion steps, and artifact notices with the release-compliance work.
- Do not download executables or require a user-installed updater.

## Acceptance criteria

- A clean offline install has every rule asset required by its advertised routing presets.
- Corrupt, oversized, incompatible, or checksum-mismatched updates fail closed and preserve the previous valid assets.
- Asset versions and verification state are observable without exposing raw engine configuration.
- Desktop and mobile bundle verification proves the expected assets and notices are present.
- Fixtures and tests do not depend on live upstream availability.

## Changeset

- Expected packages: @rahrow/core (minor), @rahrow/engine (minor), @rahrow/desktop (minor), @rahrow/mobile (minor), @rahrow/cli (minor).
- Release-note intent: RahRow bundles verified geographic/domain routing data and manages safe data-only updates.
- Reconcile the final package list during implementation; the application packages are a fixed Changesets group.

## References

- https://github.com/SagerNet/sing-geosite — upstream GeoSite database and sing-box rule sets.
- https://github.com/SagerNet/sing-geoip — upstream GeoIP database and sing-box rule sets.
- https://github.com/SagerNet/sing-box/blob/testing/docs/manual/proxy/client.md — official remote rule-set usage examples.
- Task 7a283a — artifact-specific notices and SBOM work.
- Task 91489e — RahRow licensing and attribution gate.
