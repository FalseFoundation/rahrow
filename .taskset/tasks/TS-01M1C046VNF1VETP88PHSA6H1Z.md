---
id: TS-01M1C046VNF1VETP88PHSA6H1Z
title: Add policy-safe composable advertising gates
status: done
priority: high
risk: high
createdAt: 2026-08-31 13:28 UTC
updatedAt: 2026-08-31 14:38 UTC
labels:
  - ads
  - monetization
  - architecture
files:
  - packages/ads
directories:
  - packages/features/src/ads
projects:
  - rahrow
---

Implement optional provider-neutral ad gating after every third committed profile selection and after successful connection. Persist unfinished obligations across restart, preserve full VPN functionality without a configured provider, comply with provider/store dismissal and consent rules, and keep ads outside core, protocols, engines, subscriptions, and storage.
