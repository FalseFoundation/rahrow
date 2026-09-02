---
id: TS-01M0QTPWAZNV0FEH15DS91C7CB
title: Harden import export and subscription pipelines
status: done
priority: high
risk: high
createdAt: 2026-08-23 17:29 UTC
updatedAt: 2026-08-23 18:40 UTC
labels:
  - prod-grade
  - subscriptions
  - protocols
  - security
  - p0-release-blocker
dependsOn:
  - TS-01M0QTPNNCCJ5FGVMNZ1C556F9
parent: TS-01M0QTNQ6P1VF8S21D8EVXRJ1T
directories:
  - packages/core
projects:
  - rahrow-core
---

Harden all profile input and output paths through the shared pipeline. Acceptance: URL, clipboard/manual text, subscription text/base64, QR/share payloads all converge through the same decode/detect/parse/normalize/validate path; partial subscription failures report usable errors without dropping valid profiles.
