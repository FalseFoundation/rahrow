---
id: 7695b4
title: Implement Hysteria, Hysteria2, and SSH profiles
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

Canonical Hysteria, Hysteria2, and host-key-pinned SSH schemas, URL import/export, subscriptions, shared UI, sing-box mappings, capability gating, and malformed-input tests are implemented. Single-application acceptance means each protocol is advertised only on artifacts that embed its capable engine and required assets; users never install sing-box, SSH helpers, or other runtimes separately. Completion remains blocked on pinned embedded engine artifacts, build-tag/version verification, and installed-artifact TCP/UDP evidence.
