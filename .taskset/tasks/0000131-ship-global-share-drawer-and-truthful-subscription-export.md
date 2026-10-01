---
id: 0000131-ship-global-share-drawer-and-truthful-subscription-export
title: Ship global share drawer and truthful subscription export
status: done
priority: high
risk: medium
createdAt: 2026-08-30 18:40 UTC
updatedAt: 2026-08-30 18:48 UTC
labels:
  - sharing
  - subscriptions
  - qr
parent: 0000122-harden-connection-operations-and-runtime-observability
directories:
  - packages/features
  - packages/ui
projects:
  - rahrow
---

Render one app-global share drawer with original content, real QR generation, copy, system share, PNG download, and Sonner feedback. Subscription primary export is its original source URL; expanded child serialization is a lazy secondary copy action with resource warning. Verify secrets never enter logs.
