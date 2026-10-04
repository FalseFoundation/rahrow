---
id: "667788"
title: Support raw V2Ray/Xray JSON profiles safely
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

Raw Xray JSON remains fail-closed and is not exposed as an ordinary protocol or converted to sing-box. Accepted JSON must be validated and run only by the exact Xray runtime embedded in the same RahRow artifact; custom executable paths, host-installed Xray, PATH lookup, and executable downloads are forbidden release dependencies. Safe import remains blocked on pinned embedded-runtime validation plus installed rollback/export conformance.
