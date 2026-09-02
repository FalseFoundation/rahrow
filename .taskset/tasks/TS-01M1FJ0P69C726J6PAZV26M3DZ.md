---
id: TS-01M1FJ0P69C726J6PAZV26M3DZ
title: Build the shared Backup import and export drawer flow
status: done
priority: high
risk: high
createdAt: 2026-09-01 22:39 UTC
updatedAt: 2026-09-01 23:18 UTC
labels:
  - backup-restore
  - settings
  - nested-drawer
  - native-files
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
dependsOn:
  - TS-01M1FJ04ED4D9428EWJ2KA0NR8
parent: TS-01M1FHYT7403GRGB8AEVAGCA5S
directories:
  - packages/features/src/settings
  - packages/features/src/backup
  - packages/ui/src/components/ui
  - apps/desktop
  - apps/mobile
  - apps/cli
projects:
  - rahrow-uiux
  - rahrow-interfaces
---

Settings opens one Backup drawer that first asks Import or Export, then opens the appropriate nested flow. Export supports all, connections, settings, and per-item checkboxes with select-all/indeterminate states; it offers protected or explicitly warned plaintext rahrow-backup.json output. Import previews metadata and selected contents before an atomic confirmation, reports conflicts/skips/errors clearly, and never reveals secrets unnecessarily. Inject file pick/save and crypto capabilities at host edges, preserve desktop/mobile visual parity and focus/back behavior, and expose equivalent CLI import/export flags without a drawer.
