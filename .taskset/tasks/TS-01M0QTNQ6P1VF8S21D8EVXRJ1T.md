---
id: TS-01M0QTNQ6P1VF8S21D8EVXRJ1T
title: Make RahRow production-grade
status: blocked
priority: high
risk: high
createdAt: 2026-08-23 17:28 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - prod-grade
  - architecture
  - blocked-signing
related:
  - TS-01M0R1ANJXZV14BYG8SPA1T90P
directories:
  - packages/core
  - packages/engine
  - apps/cli
  - apps/desktop
  - apps/mobile
  - packages/ui
projects:
  - rahrow-production
  - rahrow-phase-07-production-and-distribution
---

The locally implementable production foundations are in place: engine-neutral tunnel coordination, native provider contracts, secure imports, protocol compilers, pinned-runtime manifests, licensing guidance, and fail-closed release gates. Single-application acceptance requires one self-contained user-facing artifact per OS containing every advertised engine, provider, helper, asset, runtime, and desktop CLI capability, with no second CLI download, package-manager, PATH, separately installed core, or first-run executable dependency. Embedded components must be installed, updated, deactivated, and removed by RahRow without orphaned services, routes, DNS state, or engine data. This epic remains blocked on built embedded native runtimes, registered platform VPN providers, unified desktop packaging, signing/notarization, installed-device and VM lifecycle/leak evidence, and licensing approval.
