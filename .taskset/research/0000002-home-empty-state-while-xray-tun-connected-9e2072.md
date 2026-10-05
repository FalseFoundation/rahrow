---
id: "9e2072"
type: research
title: Home empty state while Xray TUN connected
status: ready
createdAt: 2026-10-05 19:58 UTC
updatedAt: 2026-10-05 19:59 UTC
related:
  - dee160
  - 2f9bfe
  - a8b229
---

## Finding
Home showed "Choose a connection" after a live Xray VPN/TUN connect because `applyConnectionSnapshot` wrote `snapshot.profileId` into selection without checking it exists in `profiles`. Empty UI is gated only on missing `selectedProfile`.

## Fix
- `resolveHomeSelectedProfileId` validates candidates against the library
- Live snapshot ids that are missing fall back to settings / current / first profile
- Mobile + desktop VPN `status()` fall back to in-memory `activeProfile.id`
- `homeDisplay` no longer treats a live session as the empty-library state

## Evidence
- Device UI dump during failure: empty title + Browse connections while tunnel was active
- Regression: useHome keeps library selection when status reports an orphan profile id
