---
id: aab45b
title: Implement Android Xray TUN file-descriptor adapter
status: doing
priority: urgent
risk: high
createdAt: 2026-08-31 00:22 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - vpn
  - android
  - xray
  - native-engine
  - p0-release-blocker
dependsOn:
  - d9f98e
parent: c1d9fc
directories:
  - apps/mobile/android
  - apps/mobile/src
  - packages/engine
projects:
  - rahrow-production
  - rahrow-phase-04-native-runtime-and-capabilities
---

Implement the missing Android Xray packet-flow provider behind VpnService. Pass the owned TUN file descriptor into the embedded libXray runtime using the supported Xray TUN FD contract, protect every upstream socket from tunnel recursion, preserve IPv4 and IPv6 routes and DNS, and provide bounded start, stop, crash, revoke, and teardown acknowledgement. Remove the forced Android Xray-to-sing-box selection only after capability probing proves the packaged ABI provider is present. Acceptance requires unit and integration coverage plus installed-device tests showing Xray and sing-box can each connect independently, fail closed when their provider is absent, leak no traffic during transitions, and leave no routes, DNS state, descriptors, or native processes behind.
