---
id: 0000080-keep-unsigned-artifacts-green-while-signing-stays-blocked
title: Keep unsigned artifacts green while signing stays blocked
status: doing
priority: high
risk: high
createdAt: 2026-08-23 19:32 UTC
updatedAt: 2026-09-02 03:51 UTC
labels:
  - prod-v2
  - packaging
  - blocked-signing
  - p0-blocker
dependsOn:
  - 0000047-prove-production-behavior-with-automated-tests
related:
  - 0000038-package-and-release-rahrow
parent: 0000048-prepare-release-artifacts-and-signing
directories:
  - apps/desktop
  - apps/mobile
  - apps/cli
  - docs
projects:
  - rahrow-release
  - rahrow-phase-07-production-and-distribution
---

Unsigned and development-signed previews must preserve the final single-application layout while production signing is unavailable. The release workflow labels unsigned outputs, validates structurally complete VPN evidence, and must never claim unavailable providers. A local unsigned macOS app containing Xray, sing-box, geo assets, licenses, and notices has been built. Active work remains to make Apple mobile, Android, Windows, and Linux preview jobs embed every advertised engine, provider, helper, asset, and desktop CLI capability with no second required download, external runtime, or first-run executable fetch. Production validation continues failing until nested components are app-installed, signed where the local OS requires it, layout-verified, and proven through lifecycle gates. Production certificates and store credentials are separate distribution boundaries and do not block these preview jobs.
