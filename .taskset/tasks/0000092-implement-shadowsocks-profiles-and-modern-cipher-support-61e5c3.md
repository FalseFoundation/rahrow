---
id: 61e5c3
title: Implement Shadowsocks profiles and modern cipher support
status: blocked
priority: urgent
risk: high
createdAt: 2026-08-27 13:16 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - p0-release-blocker
dependsOn:
  - d9f98e
parent: 9a604d
projects:
  - rahrow-phase-05-integration-and-hardening
---

Canonical Shadowsocks profiles, strict SIP002 import/export, subscription import, shared create/edit UI, modern cipher validation, Xray and sing-box compilers, manifests, and malformed-input tests are implemented. Single-application acceptance means Shadowsocks is advertised on a platform only when a compatible engine is embedded in that same RahRow artifact; external cores, plugins, PATH binaries, and runtime downloads are not supported. SIP003 plugins remain unavailable. Installed conformance is blocked on the pinned embedded native-runtime task.
