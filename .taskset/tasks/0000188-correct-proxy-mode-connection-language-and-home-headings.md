---
id: 0000188-correct-proxy-mode-connection-language-and-home-headings
title: Correct proxy-mode connection language and Home headings
status: done
priority: high
risk: high
createdAt: 2026-08-31 02:00 UTC
updatedAt: 2026-09-02 16:48 UTC
labels:
  - p1
  - hardening
  - accessibility
parent: 0000143-run-exhaustive-impeccable-ui-and-ux-hardening-program
directories:
  - packages/features/src/home
projects:
  - rahrow-uiux
  - rahrow-phase-02-light-ui-and-copy
---

Home must distinguish VPN protection from explicit proxy connection state, keep one stable h1 in loading/empty/connecting/connected states, and preserve capability/error recovery.
