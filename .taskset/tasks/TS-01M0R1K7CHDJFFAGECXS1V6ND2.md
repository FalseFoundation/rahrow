---
id: TS-01M0R1K7CHDJFFAGECXS1V6ND2
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
  - TS-01M0R1K550RG24K2062ZSJXCEF
  - TS-01M0R1JWTN9Y1BGD7D1ENK041D
  - TS-01M0R1K0XW4W5R8WA2FH0QCPJS
related:
  - TS-01M0QTS2G3ZSREDZSWX4R14EE8
parent: TS-01M0R1ANJXZV14BYG8SPA1T90P
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
