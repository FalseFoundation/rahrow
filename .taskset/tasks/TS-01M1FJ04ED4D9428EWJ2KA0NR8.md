---
id: TS-01M1FJ04ED4D9428EWJ2KA0NR8
title: Define a versioned secure RahRow backup envelope
status: done
priority: high
risk: high
createdAt: 2026-09-01 22:38 UTC
updatedAt: 2026-09-01 23:01 UTC
labels:
  - backup-restore
  - data-portability
  - security
  - tdd
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
parent: TS-01M1FHYT7403GRGB8AEVAGCA5S
directories:
  - packages/core/src
  - packages/storage
projects:
  - rahrow-core
  - rahrow-cross-platform-hardening
---

## Domain seam

Expose versioned export/import commands for selected connections, selected settings, or both. Validate with schemas, reject malformed/unsupported/future documents safely, preserve aggregate ownership and locks, define duplicate/conflict behavior, and apply imports atomically with rollback.

The file name is rahrow-backup.json. Plaintext export must clearly warn that it contains sensitive data. Obfuscation may improve casual readability only and must never be described as security; the protected option uses authenticated password-based encryption with standard platform crypto, versioned KDF/cipher parameters, integrity authentication, and no stored password. Cover wrong password, corruption, migrations, partial selection, and secrets in public-seam tests.
