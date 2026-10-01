---
id: 0000255-pin-verify-license-and-release-hev-artifacts
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
parent: 0000249-adopt-hev-socks5-tunnel-as-the-default-compatible-vpn-tunnel-provider
directories:
  - apps/mobile
  - apps/desktop
  - .github/workflows
projects:
  - rahrow-native-mobile
  - rahrow-native-desktop
---

Pinned HEV 2.17.1, its source archive checksum, four exact submodule revisions, Android NDK 28, and the Android artifact checksum. The AAR embeds upstream and submodule licenses plus machine-readable source provenance. Final release verification remains in the consolidated safety pass.
