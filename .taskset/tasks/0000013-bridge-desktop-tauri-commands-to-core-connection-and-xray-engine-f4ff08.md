---
id: f4ff08
title: Bridge desktop Tauri commands to core connection and Xray engine
status: done
priority: high
risk: high
createdAt: 2026-08-21 23:31 UTC
updatedAt: 2026-08-22 01:41 UTC
labels:
  - phase-8
  - desktop
  - tauri
  - engine
dependsOn:
  - e09c0b
  - 1ae453
parent: ae97ba
directories:
  - apps/desktop
  - packages/engine
projects:
  - rahrow
---

Implement the desktop app/native boundary for connect, disconnect, restart, status, and latency test. Keep Rust limited to sidecar/process/platform access, keep TypeScript domain orchestration in core, and map command errors into stable app-facing error shapes. The React app must call package exports from @rahrow/core and @rahrow/engine through declared workspace dependencies. Completion requires unit tests for adapter behavior where practical plus desktop typecheck/build validation.
