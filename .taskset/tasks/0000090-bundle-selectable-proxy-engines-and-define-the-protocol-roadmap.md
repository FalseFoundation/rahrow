---
id: 0000090-bundle-selectable-proxy-engines-and-define-the-protocol-roadmap
title: Bundle selectable proxy engines and define the protocol roadmap
status: doing
priority: urgent
risk: high
createdAt: 2026-08-27 12:44 UTC
updatedAt: 2026-09-02 03:51 UTC
labels:
  - engine
  - packaging
  - production
related:
  - 0000039-ship-rahrow-as-a-production-v2ray-xray-client
directories:
  - engines
  - packages/engine
  - apps/desktop
  - apps/mobile
  - .github/workflows
projects:
  - rahrow-release
  - rahrow-phase-05-integration-and-hardening
---

Keep the release contract truthful: artifacts bundle only engines and protocols fully implemented through schema, import/export, UI, config compilation, native platform path, tests, licensing, and package inspection. Desktop sidecars are not sufficient for Apple VPN. Native Android and Apple libraries, protocol expansion, external transports, and the licensing/store decision remain release gates. See docs/research/vpn-tun-engine-bundling.md and all child tasks; do not close this initiative while any advertised capability is incomplete.
