---
id: 8178b2
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
  - ce193a
related:
  - "821e06"
parent: bf02bf
directories:
  - apps/cli
  - packages/core/src/backup
projects:
  - rahrow-cli
  - rahrow-interfaces
---

Expose CLI backup export/import over the shared versioned envelope. Support all, connections, settings, and explicit connection selectors; protected output must obtain a password without echoing or persisting it, while plaintext requires an explicit sensitive-data acknowledgement. Import must preview metadata/conflicts, require an explicit apply/replace policy, preserve locked descendants, and report skips/errors without printing secrets. Add parser/command tests and cross-check interoperability with rahrow-backup.json produced by desktop/mobile.
