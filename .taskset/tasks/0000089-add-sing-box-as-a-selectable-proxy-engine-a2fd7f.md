---
id: a2fd7f
title: Add sing-box as a selectable proxy engine
status: done
priority: high
risk: high
createdAt: 2026-08-27 11:50 UTC
updatedAt: 2026-08-27 12:31 UTC
labels:
  - engine
  - sing-box
directories:
  - packages/engine
  - packages/core
  - packages/features
  - apps/cli
  - apps/desktop
  - apps/mobile
  - engines
projects:
  - rahrow
---

Implement sing-box alongside Xray behind ProxyEngine. Add config generation and runtime resolution, make persisted engine selection drive connect/status/test, expose supported engines in Settings, wire platform adapters truthfully, and cover engine/config/selection behavior with Vitest.
