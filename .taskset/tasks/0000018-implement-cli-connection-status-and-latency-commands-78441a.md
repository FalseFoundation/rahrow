---
id: 78441a
title: Implement CLI connection status and latency commands
status: done
priority: medium
risk: high
createdAt: 2026-08-21 23:31 UTC
updatedAt: 2026-08-22 02:09 UTC
labels:
  - phase-10
  - cli
  - lifecycle
  - diagnostics
dependsOn:
  - eb2fe8
  - b24666
parent: 1813d4
directories:
  - apps
projects:
  - rahrow
---

Implement CLI connect, disconnect, status, restart, and latency test commands using ConnectionController and the engine runtime boundary. The CLI must share core lifecycle semantics, persist selected/current profile state consistently, and report Xray runtime unavailability distinctly from malformed profile input.
