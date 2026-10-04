---
id: c9977d
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
  - 8e4a87
  - a20f15
  - 6fa2c2
  - 9d6390
  - "844182"
  - 73122e
  - 61ed96
  - e208b3
  - 48bac7
  - "878195"
parent: 9395f1
directories:
  - tests
  - apps
  - packages
projects:
  - rahrow-release
---

Add production checks. Acceptance: CI runs lint, typecheck, Vitest, architecture tests, package builds, desktop web build, mobile web build, and selected runtime smoke tests.
