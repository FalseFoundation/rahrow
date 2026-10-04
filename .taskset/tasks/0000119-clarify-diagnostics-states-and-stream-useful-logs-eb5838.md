---
id: eb5838
title: Clarify diagnostics states and stream useful logs
status: done
priority: high
risk: high
createdAt: 2026-08-30 17:24 UTC
updatedAt: 2026-08-30 20:25 UTC
labels:
  - diagnostics
  - logs
  - desktop
parent: "542944"
directories:
  - packages/features/src/diagnostics
  - packages/features/src/logs
  - apps/desktop/src
  - apps/desktop/src-tauri
projects:
  - rahrow
---

Goal: distinguish availability from enabled/running state, remove false sidecar errors in normal stopped state, and ensure Diagnostics receives lifecycle and diagnostics records. Acceptance: stopped bundled sidecars report available/stopped rather than disabled; missing runtime is unavailable with actionable dev guidance; toggle capabilities may report enabled/disabled; refreshing Diagnostics writes a local log record; engine/native output is surfaced when available. Validation: Rust diagnostics tests, runtime tests, Diagnostics and Logs tests.
