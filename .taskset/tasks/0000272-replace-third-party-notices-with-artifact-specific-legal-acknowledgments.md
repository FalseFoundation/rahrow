---
id: 0000272-replace-third-party-notices-with-artifact-specific-legal-acknowledgments
title: Replace THIRD_PARTY_NOTICES with artifact-specific legal acknowledgments
status: todo
priority: urgent
risk: critical
createdAt: 2026-09-02 15:49 UTC
updatedAt: 2026-09-02 15:49 UTC
labels:
  - licensing
  - third-party
  - notices
  - sbom
  - release-compliance
  - cleanup
related:
  - 0000090-bundle-selectable-proxy-engines-and-define-the-protocol-roadmap
parent: 0000103-resolve-engine-licensing-and-store-distribution-model
directories:
  - engines
  - apps/desktop
  - apps/mobile
  - apps/cli
  - .github/workflows
  - docs
projects:
  - rahrow-release
  - rahrow-phase-07-production-and-distribution
---

Remove the hand-maintained root THIRD_PARTY_NOTICES file after replacing it with a reproducible, artifact-specific compliance system. Derive bundled dependency licenses, copyright notices, required Apache NOTICE text, source offers, modifications, engine licenses, native library licenses, fonts/assets, and platform redistributables from exact lockfiles, engine manifests, pins, and build outputs. Expose readable acknowledgments inside each desktop/mobile app and CLI distribution, and ship the legally required LICENSE, NOTICE, license-text, SPDX SBOM, or source-bundle material beside each artifact as applicable.

Do not delete or hide attribution merely to remove the repository file. Apache-2.0 section 4, MPL notice rules, copyleft corresponding-source obligations, store requirements, and every bundled component must be reviewed against the actual distribution layout. Fail release when generated acknowledgments are missing, stale, unmatched to an artifact, or omit a required notice. The root THIRD_PARTY_NOTICES file is deleted only after counsel-approved parity is demonstrated across source releases and installed artifacts.

Primary sources:
- https://apache.org/licenses/LICENSE-2.0.html
- https://www.apache.org/legal/apply-license
- https://www.mozilla.org/en-US/MPL/2.0/
