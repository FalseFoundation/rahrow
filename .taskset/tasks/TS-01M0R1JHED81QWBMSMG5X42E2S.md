---
id: TS-01M0R1JHED81QWBMSMG5X42E2S
title: Make the Xray engine a real production runtime
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:29 UTC
updatedAt: 2026-08-23 20:35 UTC
labels:
  - prod-v2
  - engine
  - xray
  - p0-blocker
dependsOn:
  - TS-01M0R1J88162KKWAMHX36EBWP1
related:
  - TS-01M0QTQF1M5EGGJ05R91X68RPY
  - TS-01M0QTQ96WZG5EWKNA84RWWXWJ
parent: TS-01M0R1ANJXZV14BYG8SPA1T90P
directories:
  - packages/engine
  - engines
projects:
  - rahrow-engine
---

Epic: XrayEngine must generate complete configs and run a real process, not NoopXrayProcess / NoopXrayLatencyProbe.

Acceptance: DNS, routing, sniffing, mux, and stream settings are generated from ConnectionProfile; process start/stop/restart/crash is owned by packages/engine plus platform process adapters; future engines can still implement ProxyEngine without UI changes.
