---
id: TS-01M17F41HXPNCYST5W4SWZY0EG
title: Build one connection import drawer and preserve subscription ownership
status: done
priority: urgent
assignees:
  - codex-connection-import
risk: high
createdAt: 2026-08-29 19:14 UTC
updatedAt: 2026-08-29 19:27 UTC
labels:
  - ui-refresh
  - import
  - subscriptions
  - shadcn
parent: TS-01M0ZN2HRE96PN6HY45XKQYM7N
directories:
  - packages/features
  - packages/core
  - packages/ui
projects:
  - rahrow-uiux
---

Replace separate Add Connection and Import flows with one accessible drawer containing QR URL and Manual tabs. QR shows the injected camera preview and scanner state; URL is one input with paste helper; Manual starts with protocol and profile type then renders protocol-specific forms. Use appropriate Hugeicons actions and nested drawers only where composition requires them. Model standalone profiles separately from subscriptions and keep imported subscription profiles owned and rendered inside their subscription rather than as standalone profiles. Add behavior tests for import classification persistence and presentation.
