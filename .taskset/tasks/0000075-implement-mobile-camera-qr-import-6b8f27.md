---
id: 6b8f27
title: Implement mobile camera QR import
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:32 UTC
updatedAt: 2026-08-24 00:54 UTC
labels:
  - prod-v2
  - mobile
  - ux
  - p1-product
dependsOn:
  - 95c8ed
  - 53d42f
parent: 8d52d4
directories:
  - apps/mobile
  - packages/features
projects:
  - rahrow-mobile
---

Provide a camera QR decoder capability to the shared Import feature. Decoding returns a string; protocol parsing stays in core.

Acceptance: scanned VLESS/VMess/Trojan/subscription payloads enter the shared import pipeline.
