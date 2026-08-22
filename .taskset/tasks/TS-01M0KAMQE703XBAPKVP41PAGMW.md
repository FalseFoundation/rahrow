---
id: TS-01M0KAMQE703XBAPKVP41PAGMW
title: Implement CLI connection status and latency commands
status: todo
priority: medium
risk: high
createdAt: 2026-08-21 23:31 UTC
updatedAt: 2026-08-21 23:31 UTC
labels:
  - phase-10
  - cli
  - lifecycle
  - diagnostics
dependsOn:
  - TS-01M0KAMB3CDSKAVR8738K78ZGT
  - TS-01M0KAKX7FW41EEZ053TCWPBFN
parent: TS-01M0K4QV6WPBQNGBM7EW90EF16
directories:
  - apps
projects:
  - rahrow
---

Implement CLI connect, disconnect, status, restart, and latency test commands using ConnectionController and the engine runtime boundary. The CLI must share core lifecycle semantics, persist selected/current profile state consistently, and report Xray runtime unavailability distinctly from malformed profile input.
