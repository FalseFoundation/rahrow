---
id: TS-01M0KAMB3CDSKAVR8738K78ZGT
title: Scaffold the RahRow CLI workspace and command framework
status: done
priority: medium
risk: medium
createdAt: 2026-08-21 23:31 UTC
updatedAt: 2026-08-22 02:02 UTC
labels:
  - phase-10
  - cli
  - workspace
dependsOn:
  - TS-01M0K4Q9JK7MQFS53BBBWHYMVX
  - TS-01M0K4Q9JNYV1EFNZFRFS4N00P
parent: TS-01M0K4QV6WPBQNGBM7EW90EF16
directories:
  - apps
projects:
  - rahrow
---

Create apps/cli as a private Node.js TypeScript workspace with minimal command routing for profiles, import, export, connect, disconnect, status, test, and subscription. Consume @rahrow/core and @rahrow/engine through package exports and declared workspace dependencies. Keep CLI output deterministic and script names aligned with Turbo without adding unnecessary aliases.
