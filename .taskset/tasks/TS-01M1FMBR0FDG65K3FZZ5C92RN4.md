---
id: TS-01M1FMBR0FDG65K3FZZ5C92RN4
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
  - TS-01M1FJ04ED4D9428EWJ2KA0NR8
related:
  - TS-01M1FJ0P69C726J6PAZV26M3DZ
parent: TS-01M1FHYT7403GRGB8AEVAGCA5S
directories:
  - apps/cli
  - packages/core/src/backup
projects:
  - rahrow-cli
  - rahrow-interfaces
---

Expose CLI backup export/import over the shared versioned envelope. Support all, connections, settings, and explicit connection selectors; protected output must obtain a password without echoing or persisting it, while plaintext requires an explicit sensitive-data acknowledgement. Import must preview metadata/conflicts, require an explicit apply/replace policy, preserve locked descendants, and report skips/errors without printing secrets. Add parser/command tests and cross-check interoperability with rahrow-backup.json produced by desktop/mobile.
