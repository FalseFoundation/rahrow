---
id: 2659b4
title: Resolve engine licensing and store distribution model
status: blocked
priority: urgent
risk: high
createdAt: 2026-08-27 18:33 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - licensing
  - release
  - legal-review
  - p0-release-blocker
parent: 9a604d
directories:
  - engines
  - apps/mobile
  - apps/desktop
projects:
  - rahrow-release
  - rahrow-phase-07-production-and-distribution
---

Primary-source research is recorded in docs/research/engine-licensing-store-distribution.md. Licensing decisions must preserve one self-contained RahRow application per OS: an engine may be an embedded sidecar or native library, but it must ship inside the RahRow artifact and remain app-owned rather than a separate user-installed product. Initial Apple and Google Play builds should advertise only Xray/libXray unless libbox distribution is approved; Windows/Linux may embed separate-process sing-box only after aggregation review. Every artifact requires immutable source bundles, notices, SPDX SBOM, reproducible manifests, exact pins, and checksums. Blocked on qualified counsel approval of GPL/MPL, corresponding source, Installation Information, Wintun, store terms, signing, and each bundled distribution layout.
