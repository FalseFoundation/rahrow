---
id: "592031"
type: lesson
title: Never apply live connection profileId without library membership
status: active
createdAt: 2026-10-05 19:59 UTC
updatedAt: 2026-10-05 19:59 UTC
related:
  - dee160
  - "9e2072"
severity: high
relatedSkills:
  - .agents/skills/rahrow-implement/SKILL.md
---

## Trigger / symptom
Home drops to "Choose a connection" / empty cards while VPN/TUN reports connected.

## Incorrect pattern
Write `snapshot.profileId` straight into Home selection (or treat any live id as authoritative) without checking it exists in the current profile library. Gate the empty state only on `!selectedProfile`.

## Correct pattern
Resolve selection with an ordered, membership-checked candidate list (`live id` → `activeProfileId` → current → first library profile). VPN `status()` must fall back to the in-memory connected profile id. Never show the no-library empty state for a live session.

## Blast radius / severity
High: makes a working tunnel look broken and removes Connect/Disconnect controls.

## Prevention
Keep `resolveHomeSelectedProfileId` (or equivalent) as the only selection writer for Home snapshots; regression-test orphan live profile ids.

## Evidence
`.taskset/research/0000002-home-empty-state-while-xray-tun-connected-9e2072.md`, task `dee160`
