---
id: TS-01M0R1R7ZYVPC6JMAMTRN8RWZ0
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
  - TS-01M0R1QMZNEN451CGSSZGC2KPX
  - TS-01M0R1R21KKCZS36C98D1N9S4Q
parent: TS-01M0R1K0XW4W5R8WA2FH0QCPJS
directories:
  - apps/mobile
  - packages/features
projects:
  - rahrow-mobile
---

Provide a camera QR decoder capability to the shared Import feature. Decoding returns a string; protocol parsing stays in core.

Acceptance: scanned VLESS/VMess/Trojan/subscription payloads enter the shared import pipeline.
