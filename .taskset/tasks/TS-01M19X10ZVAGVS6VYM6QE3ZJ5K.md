---
id: TS-01M19X10ZVAGVS6VYM6QE3ZJ5K
title: Add native mobile subscription metadata fetch
status: done
priority: high
risk: high
createdAt: 2026-08-30 17:56 UTC
updatedAt: 2026-08-30 20:46 UTC
labels:
  - mobile
  - subscriptions
  - native
parent: TS-01M19V6VYXDRMGVQ8XZKAXPR49
directories:
  - apps/mobile
  - packages/core
projects:
  - rahrow
---

Implement an authenticated, bounded Capacitor native HTTPS fetch on Android and iOS that returns the subscription body plus an allowlisted set of response headers. This is required where WebView CORS does not expose Subscription-Userinfo. Preserve URL redaction, redirect denial, size limits, and same-request metadata capture.
