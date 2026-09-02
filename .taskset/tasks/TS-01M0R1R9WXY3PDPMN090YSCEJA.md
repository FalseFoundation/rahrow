---
id: TS-01M0R1R9WXY3PDPMN090YSCEJA
title: Run CLI against a real Xray process and URL subscriptions
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:32 UTC
updatedAt: 2026-08-23 20:46 UTC
labels:
  - prod-v2
  - cli
  - p0-blocker
dependsOn:
  - TS-01M0R1KH662E1YDX6Y8JMA55ME
parent: TS-01M0R1K2XMD88TE4ZYAS1M6J8N
directories:
  - apps/cli
projects:
  - rahrow-cli
---

CLI connect must start Xray. subscription refresh must fetch URLs, not only parse pasted bodies.

Acceptance: documented commands, JSON stdout, stderr diagnostics, tests with fake process/fetcher.
