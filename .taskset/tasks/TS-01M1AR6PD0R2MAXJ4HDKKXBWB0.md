---
id: TS-01M1AR6PD0R2MAXJ4HDKKXBWB0
title: Wire persisted language to document locale and direction
status: done
priority: medium
createdAt: 2026-08-31 01:51 UTC
updatedAt: 2026-08-31 03:04 UTC
labels:
  - i18n
  - accessibility
parent: TS-01M1AMFA17C96Z6VRNRGDP6KAW
directories:
  - apps/desktop
  - apps/mobile
  - packages/features/src/app
projects:
  - rahrow-uiux
---

Add an explicit app locale seam before RTL testing: read the persisted language setting during shell startup, set document.documentElement.lang and dir from supported locale metadata, cover desktop/mobile parity, and verify logical layout under RTL. Current apps only declare static lang=en in index.html, so this must not be simulated in parity tests before the runtime seam exists.
