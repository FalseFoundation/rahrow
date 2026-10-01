---
id: 0000001-implement-protocol-url-parsing-and-serialization
title: Implement protocol URL parsing and serialization
status: done
priority: high
risk: high
createdAt: 2026-08-21 21:47 UTC
updatedAt: 2026-08-21 21:51 UTC
labels:
  - phase-4
  - protocols
directories:
  - packages/core
projects:
  - rahrow
---

Implement VLESS, VMess, and Trojan URL parse/normalize/serialize through the shared core pipeline with malformed-input tests. Keep protocol logic independent of desktop, mobile, Tauri, Capacitor, Xray, and UI.
