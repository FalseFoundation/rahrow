---
id: 0000227-audit-about-ownership-and-rahrow-package-boundaries
title: Audit About ownership and RahRow package boundaries
status: done
priority: medium
risk: medium
createdAt: 2026-09-01 22:38 UTC
updatedAt: 2026-09-01 22:55 UTC
labels:
  - architecture-audit
  - package-boundaries
  - fba
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
parent: 0000224-correct-shell-regressions-and-add-portable-backup-workflows
directories:
  - packages/core
  - packages/features
  - apps
projects:
  - rahrow-core
  - rahrow-uiux
---

Determine whether About metadata is reusable product/platform domain data or feature-only presentation. Move it only if dependency direction and consumers prove the current owner wrong. Use the RahRow architecture rules to inspect nearby bypasses (feature workflows in UI/core, domain logic in apps, app dependencies in features, barrels/compatibility exports), fix bounded verified violations, and record larger findings as dependent Taskset work.
