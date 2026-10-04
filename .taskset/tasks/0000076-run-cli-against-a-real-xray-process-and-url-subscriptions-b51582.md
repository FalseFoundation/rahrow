---
id: b51582
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
  - b66068
parent: 390a47
directories:
  - apps/cli
projects:
  - rahrow-cli
---

CLI connect must start Xray. subscription refresh must fetch URLs, not only parse pasted bodies.

Acceptance: documented commands, JSON stdout, stderr diagnostics, tests with fake process/fetcher.
