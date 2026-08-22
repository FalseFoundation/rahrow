---
id: TS-01M0KAMH1K6DTZJ64WC73F47KN
title: Implement CLI profile import export and subscription commands
status: todo
priority: medium
risk: high
createdAt: 2026-08-21 23:31 UTC
updatedAt: 2026-08-21 23:31 UTC
labels:
  - phase-10
  - cli
  - import
  - subscriptions
dependsOn:
  - TS-01M0KAMB3CDSKAVR8738K78ZGT
  - TS-01M0K4Q9JK7MQFS53BBBWHYMVX
  - TS-01M0K4Q9JNYV1EFNZFRFS4N00P
parent: TS-01M0K4QV6WPBQNGBM7EW90EF16
directories:
  - apps
projects:
  - rahrow
---

Implement CLI commands for listing profiles, importing direct protocol URLs, exporting protocol URLs, adding/removing subscriptions, and parsing subscription contents through the shared import/storage pipeline. Treat file/stdin/network input as untrusted, return actionable errors for malformed VLESS/VMess/Trojan/subscription data, and do not duplicate parser logic in the CLI.
