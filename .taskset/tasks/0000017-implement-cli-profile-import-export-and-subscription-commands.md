---
id: 0000017-implement-cli-profile-import-export-and-subscription-commands
title: Implement CLI profile import export and subscription commands
status: done
priority: medium
risk: high
createdAt: 2026-08-21 23:31 UTC
updatedAt: 2026-08-22 02:06 UTC
labels:
  - phase-10
  - cli
  - import
  - subscriptions
dependsOn:
  - 0000016-scaffold-the-rahrow-cli-workspace-and-command-framework
  - 0000003-implement-import-pipeline-and-subscription-parsing
  - 0000005-implement-local-profile-and-settings-persistence
parent: 0000008-implement-cli-commands-over-shared-core-capabilities
directories:
  - apps
projects:
  - rahrow
---

Implement CLI commands for listing profiles, importing direct protocol URLs, exporting protocol URLs, adding/removing subscriptions, and parsing subscription contents through the shared import/storage pipeline. Treat file/stdin/network input as untrusted, return actionable errors for malformed VLESS/VMess/Trojan/subscription data, and do not duplicate parser logic in the CLI.
