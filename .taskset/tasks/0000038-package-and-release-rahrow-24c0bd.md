---
id: 24c0bd
title: Package and release RahRow
status: blocked
priority: high
risk: high
createdAt: 2026-08-23 17:30 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - prod-grade
  - packaging
  - p0-release-blocker
  - blocked-signing
dependsOn:
  - c9977d
  - d9f98e
  - a4e92a
  - c5c1af
  - c1d9fc
  - c2d2a7
  - e083f8
  - cceb79
  - 400aaa
  - 7eaa15
related:
  - edf1c2
  - 713ce0
parent: 9395f1
directories:
  - apps/desktop
  - apps/mobile
  - apps/cli
projects:
  - rahrow-release
  - rahrow-phase-07-production-and-distribution
---

The CLI, mobile web, desktop web, and a local unsigned macOS app bundle build successfully; the macOS bundle contains Xray, sing-box, geo assets, licenses, and notices. Completion requires one self-contained application artifact for each target OS and release channel. Desktop CLI behavior must ship inside and be managed by the same desktop installation; a standalone CLI build may exist for contributors but must not be a second required production download. Each artifact must embed all advertised engines and OS providers, verify its installed layout, require no separate runtime or package installation, perform no first-run executable download, and own update and removal of nested services or extensions. Production publishing remains blocked on unified packaging, signing/notarization, Apple entitlements, registered Windows/Linux/macOS providers, immutable runtime checksums, and installed device or VM lifecycle evidence.
