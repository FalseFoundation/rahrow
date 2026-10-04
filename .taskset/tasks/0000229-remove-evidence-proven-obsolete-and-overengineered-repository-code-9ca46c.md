---
id: 9ca46c
title: Remove evidence-proven obsolete and overengineered repository code
status: done
priority: low
risk: high
createdAt: 2026-09-01 22:38 UTC
updatedAt: 2026-09-01 23:09 UTC
labels:
  - dead-code-audit
  - simplification
  - compatibility
  - reachability
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
parent: bf02bf
directories:
  - packages
  - apps
  - scripts
  - docs
  - .github
projects:
  - rahrow-production
  - rahrow-testing
---

Inventory backward-compatibility shims, unused exports/hooks/tests/scripts/docs/config, generated artifacts, and unnecessary abstraction. Remove an item only after graph reachability, package/export consumers, scripts/CI/release references, installed-artifact needs, and platform-specific entrypoints show it is unnecessary. Preserve required migration readers and compatibility that protects persisted user data. Each deletion needs focused validation and a recoverable reviewable diff; broad speculative cleanup is out of scope.
