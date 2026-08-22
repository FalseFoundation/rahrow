---
id: TS-01M0KAKDEVCKFS22FFQHFC9QA5
title: Finish migration cleanup and dependency graph enforcement
status: done
priority: high
risk: high
createdAt: 2026-08-21 23:30 UTC
updatedAt: 2026-08-22 00:33 UTC
labels:
  - phase-2
  - cleanup
  - tooling
directories:
  - packages
  - apps
  - packages/tooling
  - packages/ui
projects:
  - rahrow
---

Audit the migrated workspace against the RahRow plan and remove or justify leftover framework/tooling surface: no NestJS, Next.js in client apps, Expo/React Native, backend infrastructure, empty packages, or unused framework configs. Ensure package manifests declare only real dependencies, internal dependencies use workspace:*, and app imports consume package exports instead of sibling source paths. Completion requires an updated dependency graph, README/docs corrections where behavior changed, and focused validation for affected package builds/typechecks.
