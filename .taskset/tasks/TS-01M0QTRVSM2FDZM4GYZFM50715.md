---
id: TS-01M0QTRVSM2FDZM4GYZFM50715
title: Add production checks
status: done
priority: high
risk: high
createdAt: 2026-08-23 17:30 UTC
updatedAt: 2026-08-23 19:09 UTC
labels:
  - prod-grade
  - testing
  - ci
  - p0-release-blocker
dependsOn:
  - TS-01M0QTPF662C3D9885ESQV0RSB
  - TS-01M0QTPNNCCJ5FGVMNZ1C556F9
  - TS-01M0QTPWAZNV0FEH15DS91C7CB
  - TS-01M0QTQ20XC832MAR5ST120D7P
  - TS-01M0QTQ96WZG5EWKNA84RWWXWJ
  - TS-01M0QTQF1M5EGGJ05R91X68RPY
  - TS-01M0QTQQBDA75D6MN9JDMFRGWW
  - TS-01M0QTQY7NTMKX6QT3W21W501W
  - TS-01M0QTR591JEVY8C5G423WJSB9
  - TS-01M0QTRG8AKNY9FW586E2X19BM
parent: TS-01M0QTNQ6P1VF8S21D8EVXRJ1T
directories:
  - tests
  - apps
  - packages
projects:
  - rahrow-release
---

Add production checks. Acceptance: CI runs lint, typecheck, Vitest, architecture tests, package builds, desktop web build, mobile web build, and selected runtime smoke tests.
