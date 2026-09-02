---
id: TS-01M0R1K2XMD88TE4ZYAS1M6J8N
title: Make the CLI a production automation surface
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:29 UTC
updatedAt: 2026-08-23 22:10 UTC
labels:
  - prod-v2
  - cli
  - p1-product
dependsOn:
  - TS-01M0R1JHED81QWBMSMG5X42E2S
  - TS-01M0R1JARRXY042TNG6TA5R2JS
related:
  - TS-01M0QTR591JEVY8C5G423WJSB9
parent: TS-01M0R1ANJXZV14BYG8SPA1T90P
directories:
  - apps/cli
  - packages/core
  - packages/engine
projects:
  - rahrow-cli
---

Epic: CLI must use the real Xray process adapter, durable storage, and subscription URL fetch.

Acceptance: profiles, import, export, subscription, connect, disconnect, status, and test work against shared core/engine; JSON on stdout; errors on stderr; documented exit codes.
