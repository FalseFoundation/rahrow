---
id: 0000091-build-pinned-native-xray-and-sing-box-runtimes-for-android-and-apple
title: Build pinned native Xray and sing-box runtimes for Android and Apple
status: doing
priority: urgent
risk: high
createdAt: 2026-08-27 13:16 UTC
updatedAt: 2026-09-02 03:51 UTC
labels:
  - native-engine
  - licensing
parent: 0000090-bundle-selectable-proxy-engines-and-define-the-protocol-roadmap
projects:
  - rahrow-phase-04-native-runtime-and-capabilities
---

Pinned exact libXray v26.7.28 and sing-box v1.13.19 source revisions, Android ABIs, Apple targets, upstream build commands, and SHA-256 release gates are defined. Go 1.26.7 is the required build-time compiler. The Apple libXray XCFramework has been compiled locally; sing-box Apple output and the schema-v2 checksum lock remain incomplete. The build workflow must pin and verify SagerNet gomobile and gobind v0.1.12, expose deterministic package-owned bootstrap/check commands, tolerate only checksum-verified module fetch paths, and never make Go or gomobile an application runtime dependency. Completion requires reproducible Android AAR/JNI and Apple XCFramework outputs embedded into development-preview bundles with no runtime download, user-installed core, language runtime, or PATH lookup. Production licensing approval and public distribution remain separate release concerns, not blockers for local compilation and fail-closed previews.
