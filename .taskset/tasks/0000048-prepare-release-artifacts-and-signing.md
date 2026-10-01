---
id: 0000048-prepare-release-artifacts-and-signing
title: Prepare release artifacts and signing
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:29 UTC
updatedAt: 2026-08-24 01:44 UTC
labels:
  - prod-v2
  - packaging
  - p0-blocker
dependsOn:
  - 0000047-prove-production-behavior-with-automated-tests
  - 0000044-ship-a-production-desktop-client-around-the-shared-ui
  - 0000045-ship-a-production-mobile-client-around-the-shared-ui
related:
  - 0000038-package-and-release-rahrow
parent: 0000039-ship-rahrow-as-a-production-v2ray-xray-client
directories:
  - apps/desktop
  - apps/mobile
  - apps/cli
projects:
  - rahrow-release
---

Unsigned CLI, desktop web, and mobile web artifacts are ready.

Do not mark the parent epic done. Signing remains blocked on TS-01M0R1RHK86AW8PKX5DG940EXS. Do not close the root ship task.

Acceptance: the unsigned pipeline stays green and the signing task remains blocked with an explicit owner path.
