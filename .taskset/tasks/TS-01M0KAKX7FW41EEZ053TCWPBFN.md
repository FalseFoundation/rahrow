---
id: TS-01M0KAKX7FW41EEZ053TCWPBFN
title: Establish Xray runtime asset management
status: done
priority: high
risk: high
createdAt: 2026-08-21 23:31 UTC
updatedAt: 2026-08-22 01:34 UTC
labels:
  - phase-6
  - engine
  - xray-runtime
dependsOn:
  - TS-01M0K4Q9JGNZ65EZT3EG1KX9SQ
directories:
  - engines
  - packages/engine
projects:
  - rahrow
---

Create the minimal Xray runtime asset boundary described by the plan without embedding engine-specific concerns in core. Add engines/xray metadata and download/verify workflow only if the runtime artifact story is explicit, keep version/checksum data deterministic, and document how desktop, CLI, and mobile adapters locate or provide Xray. Completion requires tests or scripted verification for metadata parsing/checksum handling and no UI exposure of raw Xray JSON.
