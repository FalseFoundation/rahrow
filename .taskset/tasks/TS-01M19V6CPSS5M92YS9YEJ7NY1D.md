---
id: TS-01M19V6CPSS5M92YS9YEJ7NY1D
title: Capture and display subscription usage metadata
status: done
priority: high
risk: high
createdAt: 2026-08-30 17:24 UTC
updatedAt: 2026-08-30 20:25 UTC
labels:
  - subscriptions
  - metadata
  - native
parent: TS-01M19V6VYXDRMGVQ8XZKAXPR49
directories:
  - packages/core/src/subscription
  - packages/features/src/subscriptions
  - apps/desktop
  - apps/mobile
projects:
  - rahrow
---

Goal: ingest de-facto subscription response metadata for upload, download, total quota, expiry, and optional provider links without exposing credentials. Acceptance: supported response headers survive desktop/mobile fetch ports, are validated and persisted with the subscription, and usage/expiry only render when supplied. Unknown or malformed metadata is omitted. Validation: parser, store migration, fetch adapter, and UI tests. Native note: Tauri HTTP command must return selected response headers; Capacitor web fetch support must be verified.
