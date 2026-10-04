---
id: 3b2bce
title: Implement CLI profile import export and subscription commands
status: done
priority: medium
risk: high
createdAt: 2026-08-21 23:31 UTC
updatedAt: 2026-08-22 02:06 UTC
labels:
  - phase-10
  - cli
  - import
  - subscriptions
dependsOn:
  - eb2fe8
  - 6d1387
  - "0618e9"
parent: 1813d4
directories:
  - apps
projects:
  - rahrow
---

Implement CLI commands for listing profiles, importing direct protocol URLs, exporting protocol URLs, adding/removing subscriptions, and parsing subscription contents through the shared import/storage pipeline. Treat file/stdin/network input as untrusted, return actionable errors for malformed VLESS/VMess/Trojan/subscription data, and do not duplicate parser logic in the CLI.
