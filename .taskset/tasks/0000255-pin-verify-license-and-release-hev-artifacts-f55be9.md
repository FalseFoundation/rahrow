---
id: f55be9
title: Pin, verify, license, and release HEV artifacts
status: done
priority: urgent
risk: high
createdAt: 2026-09-02 01:13 UTC
updatedAt: 2026-09-02 01:54 UTC
labels:
  - supply-chain
  - release
  - license
parent: "1876e5"
directories:
  - apps/mobile
  - apps/desktop
  - .github/workflows
projects:
  - rahrow-native-mobile
  - rahrow-native-desktop
---

Pinned HEV 2.17.1, its source archive checksum, four exact submodule revisions, Android NDK 28, and the Android artifact checksum. The AAR embeds upstream and submodule licenses plus machine-readable source provenance. Final release verification remains in the consolidated safety pass.
