---
id: 0000125-deploy-a-privacy-preserving-rahrow-exit-ip-observer
title: Deploy a privacy-preserving RahRow exit IP observer
status: todo
priority: medium
risk: high
createdAt: 2026-08-30 17:56 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - network
  - service
  - privacy
parent: 0000122-harden-connection-operations-and-runtime-observability
directories:
  - packages/features
  - apps
projects:
  - rahrow
  - rahrow-phase-05-integration-and-hardening
---

Design and deploy a minimal owned HTTPS observer that returns only the request source IP with strict timeouts, response bounds, no persistent request logs, and IPv4/IPv6 support. Add routed probes for TUN and proxy modes so Home may show an actual tunnel exit IP. This requires external service ownership and deployment authority; do not fall back to an arbitrary third-party endpoint.
