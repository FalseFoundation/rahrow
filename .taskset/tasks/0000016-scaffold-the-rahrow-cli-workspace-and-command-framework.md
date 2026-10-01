---
id: 0000016-scaffold-the-rahrow-cli-workspace-and-command-framework
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
  - 0000003-implement-import-pipeline-and-subscription-parsing
  - 0000005-implement-local-profile-and-settings-persistence
parent: 0000008-implement-cli-commands-over-shared-core-capabilities
directories:
  - apps
projects:
  - rahrow
---

Create apps/cli as a private Node.js TypeScript workspace with minimal command routing for profiles, import, export, connect, disconnect, status, test, and subscription. Consume @rahrow/core and @rahrow/engine through package exports and declared workspace dependencies. Keep CLI output deterministic and script names aligned with Turbo without adding unnecessary aliases.
