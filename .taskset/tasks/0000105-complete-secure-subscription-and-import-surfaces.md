---
id: 0000105-complete-secure-subscription-and-import-surfaces
title: Complete secure subscription and import surfaces
status: blocked
priority: urgent
risk: high
createdAt: 2026-08-27 18:34 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - import
  - subscriptions
  - security
  - p0-release-blocker
parent: 0000090-bundle-selectable-proxy-engines-and-define-the-protocol-roadmap
directories:
  - packages/core
  - packages/features
projects:
  - rahrow-release
  - rahrow-phase-05-integration-and-hardening
---

One local import pipeline now covers URL, clipboard, QR, share, file-labelled, and subscription inputs with HTTPS-only policy, bounded reads, redaction, credential resolution, mixed-protocol parsing, and atomic subscription replacement. Single-application acceptance requires all import, networking, credential storage, QR/file handling, and DNS-rebinding protection to use APIs and components bundled with RahRow or provided by the OS; no curl helper, browser extension, companion app, external vault, or separately installed utility may be required. Remaining production use is blocked on embedded platform credential-vault adapters and native DNS resolution/rebinding enforcement.
