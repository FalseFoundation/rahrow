---
id: 0000238-add-cli-backup-import-and-export-parity
title: Add CLI backup import and export parity
status: done
priority: high
risk: high
createdAt: 2026-09-01 23:20 UTC
updatedAt: 2026-09-01 23:24 UTC
labels:
  - backup-restore
  - cli
  - platform-cli
dependsOn:
  - 0000231-define-a-versioned-secure-rahrow-backup-envelope
related:
  - 0000235-build-the-shared-backup-import-and-export-drawer-flow
parent: 0000224-correct-shell-regressions-and-add-portable-backup-workflows
directories:
  - apps/cli
  - packages/core/src/backup
projects:
  - rahrow-cli
  - rahrow-interfaces
---

Expose CLI backup export/import over the shared versioned envelope. Support all, connections, settings, and explicit connection selectors; protected output must obtain a password without echoing or persisting it, while plaintext requires an explicit sensitive-data acknowledgement. Import must preview metadata/conflicts, require an explicit apply/replace policy, preserve locked descendants, and report skips/errors without printing secrets. Add parser/command tests and cross-check interoperability with rahrow-backup.json produced by desktop/mobile.
