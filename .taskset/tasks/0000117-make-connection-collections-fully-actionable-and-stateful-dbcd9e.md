---
id: dbcd9e
title: Make connection collections fully actionable and stateful
status: done
priority: high
createdAt: 2026-08-30 17:24 UTC
updatedAt: 2026-08-30 17:56 UTC
labels:
  - connections
  - subscriptions
  - ui
  - speed-test
parent: "542944"
directories:
  - packages/features/src/profiles
  - packages/features/src/subscriptions
  - packages/core/src/profile
projects:
  - rahrow
---

Goal: make standalone profiles, subscription groups, and subscription-owned profiles consistently selectable and individually or collectively editable, exportable/shareable, removable, and speed-testable. Add speed-test sorting and persist the active selection. Acceptance: returning from Home highlights the persisted active profile; each relevant row/group exposes truthful actions; group actions operate on the profiles owned by that group; speed-test results can sort rows; destructive actions are confirmed. Validation: focused model/hook/component tests plus shared feature test suite.
