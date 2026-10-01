---
id: 0000092-implement-shadowsocks-profiles-and-modern-cipher-support
title: Implement Shadowsocks profiles and modern cipher support
status: blocked
priority: urgent
risk: high
createdAt: 2026-08-27 13:16 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - p0-release-blocker
dependsOn:
  - 0000091-build-pinned-native-xray-and-sing-box-runtimes-for-android-and-apple
parent: 0000090-bundle-selectable-proxy-engines-and-define-the-protocol-roadmap
projects:
  - rahrow-phase-05-integration-and-hardening
---

Canonical Shadowsocks profiles, strict SIP002 import/export, subscription import, shared create/edit UI, modern cipher validation, Xray and sing-box compilers, manifests, and malformed-input tests are implemented. Single-application acceptance means Shadowsocks is advertised on a platform only when a compatible engine is embedded in that same RahRow artifact; external cores, plugins, PATH binaries, and runtime downloads are not supported. SIP003 plugins remain unavailable. Installed conformance is blocked on the pinned embedded native-runtime task.
