---
id: 48a929
title: Route egress and Cloudflare probes through proxy mode
status: doing
priority: high
risk: high
createdAt: 2026-09-02 00:40 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - external-ip
  - speed-test
  - proxy-mode
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
parent: "665301"
directories:
  - apps/desktop
  - apps/mobile
  - apps/cli
  - packages/core
projects:
  - rahrow-cross-platform-hardening
  - rahrow-interfaces
  - rahrow-phase-05-integration-and-hardening
---

Implement per-request SOCKS-routed HTTPS transport for the external egress-IP observation and Cloudflare readiness check after RahRow enters proxy mode. Every request must provably traverse the selected local proxy, omit credentials, reject redirects, enforce timeouts and bounded bodies, and fail closed rather than displaying the pre-proxy address. Cover macOS, Linux, Windows, Android, iOS, and CLI with native/platform tests; record a truthful unavailable capability where an OS API cannot guarantee per-request SOCKS routing.

Implementation status: desktop (Rust/ureq), Android (URLConnection with java.net.Proxy), and iOS (ephemeral URLSession with CFNetwork SOCKS configuration) have bounded allowlisted transports with no direct fallback. CLI remains fail-closed because the bundled Node transport has no SOCKS dispatcher and the repository has no reviewed SOCKS-capable CLI dependency. Keep this task doing until that CLI transport is selected and verified.
