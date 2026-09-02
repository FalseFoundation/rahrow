---
id: TS-01M1C052F3MHT7QHV95QKT0QK6
title: Implement persistent ad obligation state machine
status: done
priority: high
risk: high
createdAt: 2026-08-31 13:29 UTC
updatedAt: 2026-08-31 14:34 UTC
labels:
  - ads
  - tdd
parent: TS-01M1C046VNF1VETP88PHSA6H1Z
directories:
  - packages/ads
projects:
  - rahrow
---

Add provider-neutral contracts and a validated persistence model for profile-selection and connection-success triggers. Write obligations before presentation, recover unfinished sessions on launch, make completion idempotent, and fail open when ads are disabled or unavailable.
