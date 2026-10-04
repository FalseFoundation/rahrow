---
id: a17696
title: Wire ManagedXrayProcess into CLI and engine defaults
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:31 UTC
updatedAt: 2026-08-23 20:35 UTC
labels:
  - prod-v2
  - engine
  - cli
  - p0-blocker
parent: 761c27
directories:
  - packages/engine
  - apps/cli
projects:
  - rahrow-engine
  - rahrow-cli
---

Stop defaulting XrayEngine to NoopXrayProcess. CLI must spawn a pinned Xray binary, capture logs, time out stops, and clean stale processes.

Acceptance: connect/disconnect/status work against a real process adapter with tests that fake the spawner.
