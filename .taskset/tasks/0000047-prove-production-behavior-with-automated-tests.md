---
id: 0000047-prove-production-behavior-with-automated-tests
title: Prove production behavior with automated tests
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:29 UTC
updatedAt: 2026-08-24 01:04 UTC
labels:
  - prod-v2
  - testing
  - p0-blocker
dependsOn:
  - 0000040-complete-core-domain-protocols-and-settings
  - 0000042-make-the-xray-engine-a-real-production-runtime
  - 0000043-build-identical-desktop-mobile-product-ui-in-packages-features
  - 0000046-make-the-cli-a-production-automation-surface
related:
  - 0000037-add-production-checks
parent: 0000039-ship-rahrow-as-a-production-v2ray-xray-client
directories:
  - packages/core
  - packages/engine
  - packages/features
  - tests
projects:
  - rahrow-testing
---

Epic: executable specifications for protocol, engine config, connection lifecycle, persistence, and desktop/mobile visual parity.

Acceptance: golden URL tests, Xray config snapshots, malformed-input tests, and cross-interface contract tests. Visual parity of shared features is required.
