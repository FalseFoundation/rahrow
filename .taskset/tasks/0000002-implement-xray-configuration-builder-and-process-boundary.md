---
id: 0000002-implement-xray-configuration-builder-and-process-boundary
title: Implement Xray configuration builder and process boundary
status: done
priority: high
risk: high
createdAt: 2026-08-21 21:48 UTC
updatedAt: 2026-08-21 21:54 UTC
labels:
  - phase-6
  - engine
dependsOn:
  - 0000001-implement-protocol-url-parsing-and-serialization
directories:
  - packages/engine
projects:
  - rahrow
---

Implement XrayConfigBuilder and XrayProcess behind ProxyEngine. Test config generation without requiring a running Xray process, and do not expose Xray JSON to app UI.
