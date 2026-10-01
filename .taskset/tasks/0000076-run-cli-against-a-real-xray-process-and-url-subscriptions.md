---
id: 0000076-run-cli-against-a-real-xray-process-and-url-subscriptions
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
  - 0000051-implement-subscription-fetch-decode-and-refresh
parent: 0000046-make-the-cli-a-production-automation-surface
directories:
  - apps/cli
projects:
  - rahrow-cli
---

CLI connect must start Xray. subscription refresh must fetch URLs, not only parse pasted bodies.

Acceptance: documented commands, JSON stdout, stderr diagnostics, tests with fake process/fetcher.
