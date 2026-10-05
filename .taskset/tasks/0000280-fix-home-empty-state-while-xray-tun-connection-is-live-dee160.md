---
id: dee160
title: Fix Home empty state while Xray TUN connection is live
status: done
priority: urgent
owner: junkieshuffle
assignees:
  - junkieshuffle
createdAt: 2026-10-05 19:57 UTC
updatedAt: 2026-10-05 19:59 UTC
labels:
  - frontend
  - connection
  - bug
files:
  - packages/features/src/home/useHome.ts
  - packages/features/src/home/home-model.ts
  - packages/features/src/home/Home.tsx
  - apps/mobile/src/lib/app-runtime.ts
---

## Problem
After connecting with Xray VPN/TUN, Home drops into the empty state ("Choose a connection") even though the tunnel is live.

## Cause
`applyConnectionSnapshot` overwrote selection with an unvalidated live `profileId`. Empty UI ignored live connection state.

## Acceptance
- [x] While connected, Home never shows the no-library empty state
- [x] Selection resolves via snapshot.profileId → activeProfile → settings, always validated against profiles
- [x] Mobile VPN status falls back to in-memory active profile id
- [x] Regression tests cover connected + orphan/missing snapshot profileId
- [x] Verified build installed on device (Home shows selected connection again)

## Related
- research `9e2072`
- lesson `592031`
- desktop fallback child `a8b229` (done)
- recovery UI follow-up `ea7b83` (todo)
