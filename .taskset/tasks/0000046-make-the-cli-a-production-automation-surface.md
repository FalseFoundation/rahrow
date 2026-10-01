---
id: 0000046-make-the-cli-a-production-automation-surface
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
  - 0000042-make-the-xray-engine-a-real-production-runtime
  - 0000041-replace-in-memory-app-stores-with-durable-persistence
related:
  - 0000035-finalize-cli-as-production-automation-surface
parent: 0000039-ship-rahrow-as-a-production-v2ray-xray-client
directories:
  - apps/cli
  - packages/core
  - packages/engine
projects:
  - rahrow-cli
---

Epic: CLI must use the real Xray process adapter, durable storage, and subscription URL fetch.

Acceptance: profiles, import, export, subscription, connect, disconnect, status, and test work against shared core/engine; JSON on stdout; errors on stderr; documented exit codes.
