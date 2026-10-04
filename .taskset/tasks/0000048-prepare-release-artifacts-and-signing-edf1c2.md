---
id: edf1c2
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
  - aab829
  - a3426e
  - 8d52d4
related:
  - 24c0bd
parent: 713ce0
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
